import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { randomUUID } from "node:crypto";
import { ProjectFiles, sourceReference, type ProjectData } from "../electron/project-files";

async function main() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(),"rescript-project-test-"));
  try {
    const media = path.join(root,"original.mp4");
    await fs.writeFile(media,Buffer.alloc(1024*1024,7));
    const reference = await sourceReference(media);
    const config = path.join(root,"library.json");
    const folder = path.join(root,"Projects");
    let repo = new ProjectFiles(config,folder);
    const data: ProjectData = {id:randomUUID(),name:"Commentary",mediaKind:"video",duration:125,source:"base",transcriptLanguage:"en",words:[],showDeleted:true};
    await repo.create(data,reference);
    const file = await repo.fileFor(data.id);
    assert.ok((await fs.stat(file)).size<2048,"Source bytes must not be copied into the project");
    assert.equal((await repo.read(data.id)).data.words.length,0,"Empty projects must persist");
    await Promise.all(Array.from({length:4},(_,i)=>repo.save(data.id,{...data,name:`Revision ${i}`,manualCuts:[{id:1,start:i,end:i+1}]})));
    assert.equal((await repo.read(data.id)).revision,5);
    assert.equal((await repo.read(data.id)).data.name,"Revision 3");
    repo = new ProjectFiles(config,folder);
    assert.equal((await repo.list()).length,1,"Library survives restart");
    assert.equal((await repo.read(data.id)).media.path,media);
    const snapshots = await repo.snapshots(data.id);
    assert.equal(snapshots.length,4);
    await fs.writeFile(file,'{"damaged":');
    await assert.rejects(repo.read(data.id));
    const recovered = await repo.restore(data.id,snapshots[0]);
    assert.equal(recovered.data.name,"Revision 2");
    const moved = path.join(root,"moved.mp4");
    await fs.rename(media,moved);
    await assert.rejects(repo.mediaPath(data.id),/missing or changed/);
    const wrong = path.join(root,"wrong.mp4");
    await fs.writeFile(wrong,Buffer.alloc(1024*1024,8));
    await assert.rejects(repo.relink(data.id,wrong),/does not match/);
    await repo.relink(data.id,moved);
    assert.equal(await repo.mediaPath(data.id),moved);
    const elsewhere = path.join(root,"elsewhere","variant.rescript");
    const variant = {...recovered.data,id:randomUUID(),name:"Variant"};
    await repo.create(variant,await sourceReference(moved),elsewhere);
    assert.equal(await repo.fileFor(variant.id),elsewhere);
    assert.notEqual(variant.id,data.id);
    for(let i=0;i<11;i++) await repo.create({...data,id:randomUUID(),name:`Project ${i}`},await sourceReference(moved));
    assert.equal((await repo.list()).length,13,"No automatic ten-project deletion");
    const newFolder = path.join(root,"NewDefault");
    await repo.setFolder(newFolder);
    const next = {...data,id:randomUUID()};
    await repo.create(next,await sourceReference(moved));
    assert.ok((await repo.fileFor(next.id)).startsWith(newFolder));
    assert.equal((await repo.list()).length,14,"Changing defaults must retain earlier projects");
    assert.equal((await fs.readFile(moved)).length,1024*1024);
    console.log("PROJECT FILE TESTS PASSED: empty saves, atomic revisions, restart, corruption recovery, relinking, Save As, no pruning, default folder");
  } finally {
    const resolved=path.resolve(root);
    if(!resolved.startsWith(path.resolve(os.tmpdir())+path.sep) || !path.basename(resolved).startsWith('rescript-project-test-')) throw new Error('Unsafe test cleanup');
    await fs.rm(resolved,{recursive:true,force:true});
  }
}
void main().catch(error=>{console.error(error);process.exitCode=1;});
