import { app, BrowserWindow, dialog, ipcMain } from 'electron';

/** Wait for acknowledged durable saves before allowing the app to quit. */
export function installSafeClose(windows:()=>BrowserWindow[], setQuitting:(value:boolean)=>void) {
  let approved=false, waiting=false;
  const pending=new Map<number,{resolve:()=>void;reject:(error:Error)=>void}>();
  ipcMain.on('project:flush-reply',(event,error:unknown)=>{
    const entry=pending.get(event.sender.id);if(!entry)return;
    pending.delete(event.sender.id);
    if(typeof error==='string'&&error)entry.reject(new Error(error));else entry.resolve();
  });
  app.on('before-quit',event=>{
    if(approved){setQuitting(true);return;}
    const editors=windows().filter(win=>!win.isDestroyed()&&!win.webContents.isDestroyed());
    if(!editors.length){setQuitting(true);return;}
    event.preventDefault();
    if(waiting)return;waiting=true;
    void Promise.all(editors.map(win=>new Promise<void>((resolve,reject)=>{
      const timer=setTimeout(()=>{pending.delete(win.webContents.id);reject(new Error('The editor did not acknowledge its last save.'));},10000);
      pending.set(win.webContents.id,{resolve:()=>{clearTimeout(timer);resolve();},reject:error=>{clearTimeout(timer);reject(error);}});
      win.webContents.send('project:flush-request');
    }))).then(()=>{approved=true;app.quit();}).catch(async error=>{
      waiting=false;setQuitting(false);
      const {response}=await dialog.showMessageBox({type:'warning',message:'The latest project changes could not be saved.',detail:String(error),buttons:['Retry','Keep working','Quit without saving'],defaultId:1,cancelId:1});
      if(response===0)app.quit();
      if(response===2){approved=true;app.quit();}
    });
  });
}
