const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { Pool } = require('pg');
require('@nestjs/config').ConfigModule.forRoot({envFilePath:['.env.local','.env']});
const { PresenceService } = require('../dist/presence/presence.service.js');
const pool = new Pool({connectionString:process.env.DATABASE_URL,max:1,connectionTimeoutMillis:15000});
(async()=>{
 const client=await pool.connect();let count=0;
 const check=message=>{count++;console.log('✓ '+message);};
 try {
  await client.query('BEGIN');
  const marker=crypto.randomUUID();
  const workshop=(await client.query('INSERT INTO workshops(name) VALUES($1) RETURNING id',['QA presencia '+marker])).rows[0].id;
  const otherWorkshop=(await client.query('INSERT INTO workshops(name) VALUES($1) RETURNING id',['QA presencia otro '+marker])).rows[0].id;
  async function account(workshopId,role,suffix){const result=await client.query('INSERT INTO users(workshop_id,first_name,last_name,email,password_hash,role) VALUES($1,$2,$3,$4,$5,$6) RETURNING id',[workshopId,'QA',suffix,marker+suffix+'@example.invalid','unused-test-hash',role==='WORKER'?'MECHANIC':'ADMIN']);return {id:result.rows[0].id,workshopId,role,active:true};}
  const admin=await account(workshop,'ADMIN','admin'),worker=await account(workshop,'WORKER','worker'),other=await account(otherWorkshop,'ADMIN','other');
  const service=new PresenceService({query:(sql,params)=>client.query(sql,params)});
  const sessionA=crypto.randomUUID(),sessionB=crypto.randomUUID();
  assert.ok((await service.snapshot(admin)).every(r=>r.status==='OFFLINE'));check('Sin señales no se simula conexión');
  await service.heartbeat(worker,{sessionId:sessionA});
  assert.equal((await service.snapshot(admin)).find(r=>r.userId===worker.id).status,'ONLINE');check('Heartbeat real conecta al trabajador');
  assert.deepEqual((await service.snapshot(worker)).map(r=>r.userId),[worker.id]);check('El trabajador solo recibe su presencia');
  await service.heartbeat(other,{sessionId:crypto.randomUUID()});
  assert.ok((await service.snapshot(admin)).every(r=>r.workshopId===workshop));check('Presencia aislada por taller');
  await assert.rejects(()=>service.heartbeat(worker,{sessionId:sessionA,userId:admin.id}),e=>e.getStatus()===400);
  await assert.rejects(()=>service.heartbeat(worker,{sessionId:'invalido'}),e=>e.getStatus()===400);check('No acepta identidad ajena ni sesión inválida');
  await service.heartbeat(worker,{sessionId:sessionB});await service.disconnect(worker,{sessionId:sessionA});
  assert.equal((await service.snapshot(admin)).find(r=>r.userId===worker.id).status,'ONLINE');check('Cerrar una pestaña conserva otra conexión');
  await service.disconnect(other,{sessionId:sessionB});
  assert.equal((await service.snapshot(admin)).find(r=>r.userId===worker.id).status,'ONLINE');check('Otra cuenta no puede desconectar una sesión ajena');
  await service.disconnect(worker,{sessionId:sessionB});
  const disconnected=(await service.snapshot(admin)).find(r=>r.userId===worker.id);
  assert.equal(disconnected.status,'OFFLINE');assert.ok(disconnected.lastSeenAt);check('Cerrar sesión conserva la última conexión');
  await service.heartbeat(worker,{sessionId:sessionB});await client.query("UPDATE user_presence SET last_seen_at=now()-interval '91 seconds' WHERE user_id=$1",[worker.id]);
  assert.equal((await service.snapshot(admin)).find(r=>r.userId===worker.id).status,'OFFLINE');check('La desconexión imprevista vence sin esperar en el test');
  await service.heartbeat(worker,{sessionId:sessionB});await client.query('UPDATE users SET active=false WHERE id=$1',[worker.id]);
  assert.equal((await service.snapshot(admin)).find(r=>r.userId===worker.id).status,'DISABLED');check('Cuenta desactivada prevalece sobre señales recientes');
  console.log(count+' pruebas de presencia completadas; registros temporales revertidos.');
 } finally {await client.query('ROLLBACK');client.release();await pool.end();}
})().catch(error=>{console.error('Falló la prueba de presencia:',error.code??error.message);process.exitCode=1;});
