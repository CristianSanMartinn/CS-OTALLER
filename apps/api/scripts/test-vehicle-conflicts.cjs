const test=require('node:test');
const assert=require('node:assert/strict');
require('reflect-metadata');
const {VehiclesService}=require('../dist/vehicles/vehicles.service.js');
const workshop='11111111-1111-4111-8111-111111111111';
const owner='22222222-2222-4222-8222-222222222222';
const input={customer_id:owner,license_plate:'QA1234',brand:'QA',model:'QA',year:2020,mileage:100};
function rejecting(error){return new VehiclesService({async query(){return{rows:[{id:owner}]}},async transaction(){await Promise.resolve();throw error}})}
test('Solo UNIQUE de patente de vehicles convierte rechazo asíncrono en HTTP 409',async()=>{
 const error=Object.assign(new Error('Synthetic unique'),{code:'23505',constraint:'uq_vehicle_plate_workshop',table:'vehicles'});
 await assert.rejects(()=>rejecting(error).save(workshop,input),e=>e.getStatus()===409&&e.message==='Esta patente ya está registrada en tu taller.');
});
for(const [name,fields]of [
 ['PRIMARY KEY vehicles',{code:'23505',constraint:'vehicles_pkey',table:'vehicles'}],
 ['otro UNIQUE vehicles',{code:'23505',constraint:'uq_vehicles_id_workshop',table:'vehicles'}],
 ['PRIMARY KEY photos',{code:'23505',constraint:'photos_pkey',table:'photos'}],
 ['constraint homónimo en otra tabla',{code:'23505',constraint:'uq_vehicle_plate_workshop',table:'photos'}],
 ['23505 sin constraint',{code:'23505',table:'vehicles'}],
 ['CHECK constraint',{code:'23514',constraint:'vehicles_mileage_check',table:'vehicles'}],
 ['conexión interrumpida',{code:'08006'}],
 ['error genérico',{}],
])test('No etiqueta falsamente como patente duplicada: '+name,async()=>{
 const error=Object.assign(new Error('Synthetic unrelated error'),fields);
 await assert.rejects(()=>rejecting(error).save(workshop,input),e=>e===error);
});
test('Se conserva el manejo existente de foreign key 23503 como HTTP 400',async()=>{
 const error=Object.assign(new Error('Synthetic foreign key'),{code:'23503',constraint:'fk_vehicles_customer',table:'vehicles'});
 await assert.rejects(()=>rejecting(error).save(workshop,input),e=>e.getStatus()===400&&e.message==='Propietario inválido.');
});
test('Guardar patente nueva conserva datos y resultado del servicio',async()=>{
 const row={id:'33333333-3333-4333-8333-333333333333',workshop_id:workshop,license_plate:'QA1234'};
 let supplied;
 const service=new VehiclesService({
  async query(){return{rows:[{id:owner}]}},
  async transaction(run){
   return run({
    async query(sql,values){
     if(sql.startsWith('INSERT INTO vehicles')){supplied=values;return{rows:[row]}}
     return{rows:[]};
    }
   });
  }
 });
 const result=await service.save(workshop,input);
 assert.equal(result.id,row.id);assert.equal(result.license_plate,'QA1234');assert.equal(supplied[12],workshop);assert.deepEqual(result.photos,[]);
});
