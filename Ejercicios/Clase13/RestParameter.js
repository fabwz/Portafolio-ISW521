function sumarTodo(...numeros) {
    return numeros.reduce((acum, n) => acum + n, 0);
}

console.log(sumarTodo(1, 2, 3));
console.log(sumarTodo(1, 2, 3, 4, 5, 6, 7, 8, 9, 10));