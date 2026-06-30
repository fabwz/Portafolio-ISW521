const original = { nombre: "Equipo A", puntos: 10 };
const actualizado = { ...original, puntos: 15 };

console.log(original.puntos);
console.log(actualizado.puntos);


const numeros = [1, 2, 3];
const copia = [...numeros, 4];
console.log(copia);
