/* NBG Talent Outreach · sincronización en tiempo real · Firebase 13.2.0 */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js';
import { getFirestore, collection, doc, onSnapshot, getDoc, setDoc, deleteDoc, writeBatch } from 'https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js';

const $ = id => document.getElementById(id);
const bridge = window.NBGAppBridge;
const settings = window.NBG_FIREBASE_CONFIG;
const NAMES = {contacts:'outreach_contacts', casting:'casting_records'};
const BACKUP_KEY = 'nbg_v8_legacy_local_backup';
const MIGRATED_KEY = 'nbg_v8_legacy_migrated';
const readyConfig = settings && settings.apiKey && settings.projectId && settings.appId &&
  !Object.values(settings).some(x => typeof x !== 'string' || /PEGA_|TU_PROYECTO/.test(x));
const btnLogin=$('cloudLogin'),btnLogout=$('cloudLogout'),btnMigrate=$('cloudMigrate'),btnRetry=$('cloudRetry');
let db,auth,user=null,initial={contacts:false,casting:false,templates:false},
  synced=false, unsubscribers=[], contactMap=new Map(),castingMap=new Map(),templateDoc=null,
  session=0, pendingWrites=0;
const keyOf = x => String(x?.username||'').trim().toLowerCase();
const own = (obj,key) => Object.prototype.hasOwnProperty.call(obj,key);
const deepCopy = x => JSON.parse(JSON.stringify(x));
const formatError = e => {
  const code=String(e?.code||'');
  if(code.includes('permission-denied'))return 'Permiso denegado. Verifica que tu correo esté autorizado en firestore.rules y que las reglas estén publicadas.';
  if(code.includes('auth/unauthorized-domain'))return 'El dominio de Vercel no está autorizado. Agrégalo en Firebase Authentication > Settings > Authorized domains.';
  if(code.includes('auth/popup-blocked'))return 'El navegador bloqueó la ventana de Google. Permite ventanas emergentes e inténtalo de nuevo.';
  if(code.includes('unavailable')||code.includes('network'))return 'Sin conexión con Firebase. Revisa tu internet y vuelve a intentarlo.';
  return e?.message||'Error inesperado';
};
const status=(message,{error=false,busy=false}={})=>{
  $('cloudStatus').textContent=message;
  $('cloudHeaderTag').textContent=error?'● Error de sincronización':busy?'◌ Sincronizando…':synced?'● Firebase conectado':'● Modo local · sin conexión';
  $('cloudHeaderTag').style.color=error?'#ffbbbb':'';
  if(error){btnRetry.hidden=false;$('cloudMessage').textContent='Los cambios realizados en este navegador podrían no estar en la nube. '+message;}
};
const message=(text)=>{$('cloudMessage').textContent=text};
const enableCloud=(value)=>{window.NBGCloud.ready=!!value;synced=!!value;};

window.NBGCloud={
  ready:false,
  async saveContacts(list){await syncCollection('contacts',list)},
  async saveCasting(list){await syncCollection('casting',list)},
  async saveShot(username,data){
    if(!synced)throw Error('Inicia sesión y espera a que se conecte Firebase.');
    const key=String(username||'').toLowerCase();
    if(!/^[a-z0-9._]{1,30}$/.test(key))throw Error('Nombre de usuario no válido');
    if(data!==null && (typeof data!=='string'||!/^data:image\/jpeg;base64,/.test(data)||data.length>550000))
      throw Error('La imagen es demasiado grande. Carga una captura JPG/PNG nueva para comprimirla (máximo aproximado 400 KB).');
    const ref=doc(db,'casting_shots',key);
    if(data)await setDoc(ref,{image:data,updated:new Date().toISOString()});
    else await deleteDoc(ref);
  },
  async getShot(username){
    const key=String(username||'').toLowerCase();
    if(!synced)return null;
    try{const d=await getDoc(doc(db,'casting_shots',key));return d.exists()?d.data().image||null:null}
    catch(e){bridge.showMessage('No se pudo cargar la captura: '+formatError(e),true);return null}
  },
  async saveTemplates(data){
    if(!synced)return;
    try{await setDoc(doc(db,'app_settings','templates'),{...data,updated:new Date().toISOString()});}
    catch(e){status(formatError(e),{error:true});throw e}
  }
};

// Se guarda una copia de seguridad ANTES de sustituir datos locales por los remotos.
let legacy=null;
try{
  const existing=localStorage.getItem(BACKUP_KEY);
  if(localStorage.getItem(MIGRATED_KEY)==='1')legacy=null;
  else if(existing)legacy=JSON.parse(existing);
  else{
    const b=bridge.startupBackup;
    if(b.contacts.length||b.casting.length||['nbg_outreach_template_v1','nbg_outreach_details_template_v6','nbg_outreach_location_template_v6'].some(k=>localStorage.getItem(k)!==null)){
      // Las plantillas predeterminadas se incluyen para preservar los cambios del navegador.
      legacy=deepCopy(b);localStorage.setItem(BACKUP_KEY,JSON.stringify(legacy));
    }
  }
}catch{legacy=deepCopy(bridge.startupBackup)}
function updateMigrateButton(){
 const count=(legacy?.contacts?.length||0)+(legacy?.casting?.length||0);
 btnMigrate.hidden=!synced||!legacy||(!count&&!legacy?.templates);
 if(!btnMigrate.hidden)btnMigrate.textContent=`↑ Migrar datos del navegador (${count} registros + plantillas)`;
}

function serializeContact(c){return {
  id:String(c.id||''),username:String(c.username||''),name:String(c.name||''),
  specialty:String(c.specialty||''),status:String(c.status||'pendiente'),
  created:String(c.created||''),contactedAt:String(c.contactedAt||''),
  sources:Array.isArray(c.sources)?c.sources.map(String).slice(0,120):[]
};}
function serializeCasting(c){return {
  id:String(c.id||''),username:String(c.username||''),name:String(c.name||''),
  date:String(c.date||''),time:String(c.time||''),status:String(c.status||'confirmado'),
  notes:String(c.notes||'').slice(0,10000),created:String(c.created||''),
  updated:String(c.updated||''),hasShot:!!c.hasShot
};}
function toMap(list,kind){
 const result=new Map(),serialize=kind==='contacts'?serializeContact:serializeCasting;
 for(const item of list){const id=keyOf(item);if(/^[a-z0-9._]{1,30}$/.test(id)&&!result.has(id))result.set(id,serialize(item))}
 return result;
}
function shadow(kind){return kind==='contacts'?contactMap:castingMap}
function setShadow(kind,newMap){if(kind==='contacts')contactMap=newMap;else castingMap=newMap}
async function runOps(kind,ops){
 const col=NAMES[kind];
 for(let i=0;i<ops.length;i+=300){
   const batch=writeBatch(db);
   for(const op of ops.slice(i,i+300)){
     const ref=doc(db,col,op.key);
     if(op.remove)batch.delete(ref);else batch.set(ref,op.data);
   }
   await batch.commit();
 }
}
let writeQueues={contacts:Promise.resolve(),casting:Promise.resolve()};
function syncCollection(kind,list){
 if(!synced) return Promise.reject(new Error('No hay conexión con Firebase'));
 const desired=toMap(deepCopy(list),kind);
 const previous=shadow(kind);
 const ops=[];
 for(const [key,data] of desired)if(JSON.stringify(previous.get(key))!==JSON.stringify(data))ops.push({key,data});
 for(const key of previous.keys())if(!desired.has(key))ops.push({key,remove:true});
 if(!ops.length)return Promise.resolve();
 setShadow(kind,desired); // Estado optimista para que varias pulsaciones no escriban duplicados.
 pendingWrites++;
 status('Guardando cambios en Firebase…',{busy:true});
 const job=()=>runOps(kind,ops).then(()=>{
   pendingWrites--; if(!pendingWrites){status('Sincronizado · tus datos están disponibles en otros dispositivos');message('Conectado. Cada nuevo registro se guarda en la nube y los cambios aparecen en tus otros dispositivos.');}
 }).catch(e=>{
   pendingWrites--;
   status(formatError(e),{error:true});throw e;
 });
 writeQueues[kind]=writeQueues[kind].then(job,job);
 return writeQueues[kind];
}

function stop(){
  document.documentElement.classList.add('cloud-locked');session++;for(const cancel of unsubscribers)try{cancel()}catch{}
  unsubscribers=[];enableCloud(false);initial={contacts:false,casting:false,templates:false};
  contactMap=new Map();castingMap=new Map();templateDoc=null;pendingWrites=0;
}
function checkReady(){
 if(!Object.values(initial).every(Boolean))return;
 if(!synced){enableCloud(true);if(!legacy)try{localStorage.setItem(MIGRATED_KEY,'1')}catch{}document.documentElement.classList.remove('cloud-locked');status('Sincronizado · tus datos están disponibles en otros dispositivos');message('Conectado a Firebase. Los contactos, los castings y las plantillas se sincronizan en tiempo real. Para importar los datos antiguos de este navegador, usa «Migrar datos».');updateMigrateButton();}
}
function subscribe(uid){
 stop();const current=session;
 const register=(unsub)=>unsubscribers.push(unsub);
 for(const kind of ['contacts','casting']){
   register(onSnapshot(collection(db,NAMES[kind]),{includeMetadataChanges:true},snapshot=>{
     if(current!==session)return;
     const remote=new Map();for(const record of snapshot.docs)remote.set(record.id,record.data());
     // Con escrituras en curso se muestran los cambios optimistas locales; cuando acaben se actualiza la vista.
     if(!pendingWrites){setShadow(kind,remote);if(kind==='contacts')bridge.applyContacts([...remote.values()]);else bridge.applyCasting([...remote.values()])}
     initial[kind]=true;checkReady();
   },e=>{
     if(current!==session)return;
     status(formatError(e),{error:true});
   }));
 }
 register(onSnapshot(doc(db,'app_settings','templates'),snapshot=>{
   if(current!==session)return;
   if(snapshot.exists()){templateDoc=snapshot.data();bridge.applyTemplates(templateDoc)}
   initial.templates=true;checkReady();
 },e=>{if(current===session)status(formatError(e),{error:true})}));
}

async function migrate(){
 if(!synced||!legacy)return;
 if(!confirm('¿Importar los registros locales que aún no existen en Firebase? Los perfiles ya presentes en la nube se conservarán sin duplicarlos.'))return;
 btnMigrate.disabled=true;
 try{
   const opsContacts=[],opsCasting=[];
   const seenContacts=new Set(contactMap.keys()),seenCasting=new Set(castingMap.keys());
   for(const c of legacy.contacts||[]){const key=keyOf(c);if(!/^[a-z0-9._]{1,30}$/.test(key)||seenContacts.has(key))continue;
     opsContacts.push({key,data:serializeContact(c)});seenContacts.add(key);
   }
   for(const c of legacy.casting||[]){const key=keyOf(c);if(!/^[a-z0-9._]{1,30}$/.test(key)||seenCasting.has(key))continue;
     opsCasting.push({key,data:serializeCasting(c)});seenCasting.add(key);
   }
   status('Migrando datos anteriores…',{busy:true});
   await runOps('contacts',opsContacts);await runOps('casting',opsCasting);
   let captures=0,failed=0;
   for(const c of legacy.casting||[]){
     if(!c.hasShot||!opsCasting.some(op=>op.key===keyOf(c)))continue;
     const image=await bridge.localShot(keyOf(c));
     if(image){try{await window.NBGCloud.saveShot(keyOf(c),image);captures++}catch{failed++}}
   }
   if(!templateDoc&&legacy.templates)await window.NBGCloud.saveTemplates(legacy.templates);
   // El historial anterior se mantiene como copia local, pero no se volverá a sugerir su importación.
   localStorage.removeItem(BACKUP_KEY);localStorage.setItem(MIGRATED_KEY,'1');legacy=null;updateMigrateButton();
   status('Migración finalizada · sincronizado');
   bridge.showMessage(`Migración lista: ${opsContacts.length} contactos, ${opsCasting.length} castings y ${captures} capturas. ${failed?'Ojo: '+failed+' capturas requieren adjuntarse de nuevo.':''}`);
 }catch(e){status('Falló la migración: '+formatError(e),{error:true});bridge.showMessage('La migración no se completó. Conserva el respaldo local e inténtalo de nuevo.',true)}
 finally{btnMigrate.disabled=false}
}

btnMigrate.addEventListener('click',migrate);
btnRetry.addEventListener('click',()=>location.reload());

if(!readyConfig){
 status('Firebase aún no está configurado. Los registros se guardan solo en este navegador.');
 message('Edita firebase-config.js y completa CONFIGURACION.md. Importante: la página NO se sincroniza hasta que Firebase esté configurado y hayas iniciado sesión.');
}else{
 try{
  db=getFirestore(initializeApp(settings));auth=getAuth();
  btnLogin.disabled=false;
  status('Firebase configurado · inicia sesión con Google para sincronizar.');
  btnLogin.addEventListener('click',async()=>{
   btnLogin.disabled=true;
   try{await signInWithPopup(auth,new GoogleAuthProvider())}
   catch(e){status(formatError(e),{error:true})}
   finally{btnLogin.disabled=false}
  });
  btnLogout.addEventListener('click',async()=>{
   await signOut(auth);stop();try{localStorage.removeItem('nbg_outreach_profiles_v1');localStorage.removeItem('nbg_outreach_casting_records_v1')}catch{}location.reload();
  });
  onAuthStateChanged(auth,currentUser=>{
   user=currentUser;
   if(!user){stop();btnLogin.hidden=false;btnLogout.hidden=true;btnMigrate.hidden=true;$('cloudUser').textContent='';$('cloudUid').textContent='';status('Inicia sesión con Google. Hasta entonces, los cambios solo son locales.');return}
   btnLogin.hidden=true;btnLogout.hidden=false;
   $('cloudUser').textContent='Conectado como '+(user.email||'cuenta Google');
   $('cloudUid').textContent='UID (para reglas de seguridad): '+user.uid;
   status('Verificando permisos y cargando datos de Firestore…',{busy:true});
   subscribe(user.uid);
  });
 }catch(e){status('Firebase no se pudo iniciar: '+formatError(e),{error:true})}
}
