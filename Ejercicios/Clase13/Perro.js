import { Animal } from "./Animal.js";

export class Perro extends Animal {
    constructor(nombre, raza, especie, eadd) {
        super(nombre, especie);
        this.raza = raza;
        this.eadd = eadd;
    }

    ladrar() {
        console.log(`El perro llamado ${this.nombre} está ladrando`);
    }

    comer() {
        console.log(`El perro llamado ${this.nombre} está comiendo`);
    }
}