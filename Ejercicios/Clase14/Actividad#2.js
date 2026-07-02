// Actividad #2: Transformar arreglo en strings con formato "NOMBRE (CARNET)", todo en minuscula

const estudiantes = [
    { nombre: "Ana", carnet: "2024001" },
    { nombre: "Luis", carnet: "2024002" }
];

let resultado = estudiante.map(e => `${e.nombre}(${e.carnet})`.toUpperCase());
console.log(resultado);


