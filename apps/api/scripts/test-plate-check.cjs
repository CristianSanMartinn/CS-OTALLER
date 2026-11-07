const test=require('node:test'),assert=require('node:assert/strict');
require('reflect-metadata');
const {VehiclesService}=require('../dist/vehicles/vehicles.service.js');
const {VehiclesController}=require('../dist/vehicles/vehicles.controller.js');
const {AdminGuard}=require('../dist/auth/admin.guard.js');
const admin={id:'admin',role:'ADMIN',workshopId:'current-workshop'};
for(const [status,rows] of [['ACTIVE',[{active:true}]],['INACTIVE',[{active:false}]],['NO_MATCH',[]],['AMBIGUOUS',[{active:true},{active:false}]]])test(status+': solo estado, patente exacta normalizada y taller de sesión',async()=>{
 let call;const service=new VehiclesService({async query(sql,values){call={sql,values};return{rows}}});
 assert.deepEqual(await service.checkPlate(admin,' ab-cd.12 '),{status});
 assert.deepEqual(call.values,['current-workshop','ABCD12']);
 assert.ok(call.sql.includes('workshop_id=$1'));assert.ok(call.sql.includes('=$2 LIMIT 2'));assert.ok(!call.sql.includes('AND active'));assert.ok(!call.sql.includes('SELECT *'));
});
test('Entrada inválida no llega a SQL',async()=>{
 const service=new VehiclesService({query(){throw Error('SQL must not execute')}});
 for(const value of [undefined,null,[],{},123,'',' ','---','A'.repeat(21)])await assert.rejects(()=>service.checkPlate(admin,value),e=>e.getStatus()===400);
});
test('Trabajador rechazado antes de leer SQL',async()=>{
 const service=new VehiclesService({query(){throw Error('SQL must not execute')}});
 await assert.rejects(()=>service.checkPlate({...admin,role:'WORKER'},'ABCD12'),e=>e.getStatus()===403);
});
test('Fallo SQL no se transforma en NO_MATCH',async()=>{
 const error=Error('Connection failed');const service=new VehiclesService({async query(){throw error}});
 await assert.rejects(()=>service.checkPlate(admin,'ABCD12'),e=>e===error);
});
test('Ruta puntual conserva AdminGuard y no-store; listado sigue siendo otro método',()=>{
 const method=VehiclesController.prototype.checkPlate;
 assert.equal(Reflect.getMetadata('path',method),'plate-check');
 assert.ok(Reflect.getMetadata('__guards__',method).includes(AdminGuard));
 assert.deepEqual(Reflect.getMetadata('__headers__',method),[{name:'Cache-Control',value:'no-store'}]);
 assert.notEqual(method,VehiclesController.prototype.findAll);
});
