'use strict';


const buttonElement = document.getElementById('button');
const countElement = document.getElementById('count');


let button;
let count;


const eventHandler = function(e) {
	e.preventDefault();

	if (!e.type.endsWith('down'))
		return;

	const newButton = e.key || `Mouse ${e.which}`;

	if (newButton !== button) {
		button = newButton;
		count = 1;
	}
	else {
		count += 1;
	}

	buttonElement.innerText = `${button}`;
	countElement.innerText = `x ${count}`;
};


window.oncontextmenu = eventHandler;
window.onkeydown = eventHandler;
window.onkeyup = eventHandler;
window.onmousedown = eventHandler;
window.onmouseup = eventHandler;
