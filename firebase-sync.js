
import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js';
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect,
  onAuthStateChanged, signOut, setPersistence, browserLocalPersistence
} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js';
import {
  getFirestore, doc, getDoc, setDoc, onSnapshot, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';

const btn = document.querySelector('#syncBtn');
const status = document.querySelector('#syncStatus');

function configReady(){
  return firebaseConfig && firebaseConfig.apiKey && !firebaseConfig.apiKey.includes('PASTE_HERE');
}
if(!configReady()){
  status.textContent='Firebase config needed';
  btn.textContent='Sync setup needed';
  btn.disabled=true;
  throw new Error('Firebase config not filled in');
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({prompt:'select_account'});

let stopListening = null;
let saveTimer = null;
let currentUid = null;

await setPersistence(auth, browserLocalPersistence);

function stateRef(uid){
  return doc(db,'users',uid,'kanban','main');
}
function setStatus(text){ status.textContent=text; }

async function cloudSave(state){
  if(!currentUid) return;
  clearTimeout(saveTimer);
  saveTimer=setTimeout(async()=>{
    try{
      setStatus('Syncing…');
      await setDoc(stateRef(currentUid), {
        state,
        updatedAt: serverTimestamp()
      }, {merge:true});
      setStatus('Synced ✓');
    }catch(err){
      console.error(err);
      setStatus('Sync error');
    }
  },350);
}
window.__kanbanCloudSave = cloudSave;

async function beginSync(user){
  currentUid=user.uid;
  btn.textContent='Sign out';
  setStatus('Connecting…');

  const ref=stateRef(user.uid);
  const snap=await getDoc(ref);

  if(!snap.exists()){
    // First device: preserve existing local board by uploading it.
    await setDoc(ref,{state:window.__kanbanGetState(),updatedAt:serverTimestamp()});
    setStatus('Synced ✓');
  }else if(snap.data()?.state){
    window.__syncApplying=true;
    window.__kanbanApplyCloud(snap.data().state);
    window.__syncApplying=false;
    setStatus('Synced ✓');
  }

  if(stopListening) stopListening();
  stopListening=onSnapshot(ref,(s)=>{
    const incoming=s.data()?.state;
    if(!incoming) return;
    window.__syncApplying=true;
    window.__kanbanApplyCloud(incoming);
    window.__syncApplying=false;
    setStatus('Synced ✓');
  },(err)=>{
    console.error(err);
    setStatus('Sync error');
  });
}

onAuthStateChanged(auth, async user=>{
  if(user){
    try{ await beginSync(user); }
    catch(err){ console.error(err); setStatus('Sync error'); }
  }else{
    currentUid=null;
    if(stopListening){stopListening();stopListening=null}
    btn.textContent='Sign in to Sync';
    setStatus('Local only');
  }
});

btn.addEventListener('click',async()=>{
  if(auth.currentUser){
    await signOut(auth);
    return;
  }
  try{
    setStatus('Signing in…');
    await signInWithPopup(auth,provider);
  }catch(err){
    console.warn('Popup sign-in failed, trying redirect',err);
    try{ await signInWithRedirect(auth,provider); }
    catch(e){ console.error(e); setStatus('Sign-in failed'); }
  }
});
