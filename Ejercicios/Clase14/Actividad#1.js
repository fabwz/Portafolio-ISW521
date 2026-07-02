// Actividad #1: Reescribir bucle con funcion declarativa

// Imperativo
const precios = [100, 250, 80, 400];
const caros = [];
for (let i = 0; i < precios.length; i++) {
    if (precios[i] > 200) {
        caros.push(precios[i]);
    }
}

// Declarativo
const carosDec = precios.filter(p => p > 200);
console.log(carosDec);