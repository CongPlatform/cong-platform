import {test} from "node:test";
import assert from "node:assert/strict";
import {reservationOverlaps,validateReservationRange} from "./operational.reservation-rules.js";

test("reservas não aceitam término anterior ao início",()=>{
 assert.equal(validateReservationRange("2026-10-23T10:00:00Z","2026-10-23T09:00:00Z"),false);
 assert.equal(validateReservationRange("2026-10-23T10:00:00Z","2026-10-23T11:00:00Z"),true);
});
test("reservas aceitam períodos consecutivos",()=>{
 assert.equal(reservationOverlaps(0,100,100,200),false);
 assert.equal(reservationOverlaps(0,100,99,200),true);
 assert.equal(reservationOverlaps(0,100,0,100),true);
});
test("reservas recusam período maior que 14 dias",()=>{
 assert.equal(validateReservationRange("2026-10-23T10:00:00Z","2026-11-08T10:00:00Z"),false);
 assert.equal(validateReservationRange("inválido","2026-10-23T10:00:00Z"),false);
});
