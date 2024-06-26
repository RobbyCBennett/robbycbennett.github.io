'use strict';


/**
 * @param {string} characters allowed characters in password
 * @param {number} length length of password
 */
function generatePassword(characters, length)
{
	if (isNaN(length) || length < 1)
		return '';
	const result = [];
	const indexes = new Uint32Array(length);
	window.crypto.getRandomValues(indexes);
	for (let i = 0; i < length; ++i)
		result.push(characters.charAt(indexes[i] % characters.length));
	return result.join('');
}


/**
 * @param {HTMLElement} element element to animate
 * @param {string} color color of underline
 */
function animateUnderline(element, color)
{
	element.animate(
		[
			{ boxShadow: '0 0.25rem 0 0 transparent' },
			{ boxShadow: `0 0.25rem 0 0 ${color}` },
			{ boxShadow: `0 0.25rem 0 0 ${color}` },
			{ boxShadow: '0 0.25rem 0 0 transparent' },
		],
		{
			duration: 1000,
			iterations: 1,
		}
	);
}


function buttonSubtract()
{
	const lengthField = document.getElementById('length');
	lengthField.value = Math.max(parseInt(lengthField.value) - 1, 0);
}


function buttonAdd()
{
	const lengthField = document.getElementById('length');
	lengthField.value = Math.max(parseInt(lengthField.value) + 1, 0);
}


function buttonGenerate()
{
	const charactersField = document.getElementById('characters');
	const lengthField = document.getElementById('length');
	const resultField = document.getElementById('result');

	animateUnderline(resultField, 'var(--negative)');
	resultField.value = generatePassword(charactersField.value, parseInt(lengthField.value));
}


function buttonCopy()
{
	const resultField = document.getElementById('result');

	animateUnderline(resultField, 'var(--positive)');
	navigator.clipboard.writeText(resultField.value);
}


function main()
{
	document.getElementById('app').classList.remove('hidden');
	document.getElementById('subtract').onclick = buttonSubtract;
	document.getElementById('add').onclick = buttonAdd;
	document.getElementById('generate').onclick = buttonGenerate;
	document.getElementById('copy').onclick = buttonCopy;

	buttonGenerate();
}


main();
