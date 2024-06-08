// @ts-check
'use strict';


///////////////
// Constants //
///////////////


const ID = new URLSearchParams(window.location.search).get('id');

// TODO allow these things to be configured in the UI
const STRINGS = ['E4', 'B3', 'G3', 'D3', 'A2', 'E2'];
const FRET_COUNT = 25;
let AUTOMATIC_MOVING = false;


///////////////
// Variables //
///////////////


let editing = new URLSearchParams(window.location.search).get('edit') === 'true';
let saved = true;
let sheetName = '';
let sheetData = {
	'lines': [
		[
			{
				'beginRepeat': false,
				'endRepeat': false,
				'columns': [
					[
						'',
						'',
						'',
						'',
						'',
						''
					]
				]
			}
		]
	]
};
const cursor = {
	'line': 0,
	'measure': 0,
	'column': 0,
};


////////////////
// Google API //
////////////////


/**
 * Get music sheet file metadata in Google Drive
 */
async function googleApiGetFileMetadata()
{
	if (ID === null)
		return null;

	const params = new URLSearchParams({
		fields: 'name',
	});

	return googleApiFetchJson(
		'Getting music sheet',
		'Failed to get music sheet',
		`${GOOGLE_API_BASE_URL}/drive/v3/files/${ID}?${params}`
	);
}


/**
 * Get music sheet file data in Google Drive
 */
async function googleApiGetFileData()
{
	if (ID === null)
		return null;

	const params = new URLSearchParams({
		alt: 'media',
	});

	return googleApiFetchJson(
		'Getting music sheet',
		'Failed to get music sheet',
		`${GOOGLE_API_BASE_URL}/drive/v3/files/${ID}?${params}`
	);
}


/**
 * Update music sheet file metadata & data in Google Drive
 */
async function googleApiPatchFile()
{
	const params = new URLSearchParams({
		uploadType: 'multipart',
	});

	const metadata = JSON.stringify({
		name: sheetName,
	});

	const data = JSON.stringify(sheetData);

	const body = googleApiPrepareMultipartBody(metadata, data);

	return googleApiFetchJson(
		'Updating music sheet',
		'Failed to update music sheet',
		`${GOOGLE_API_BASE_URL}/upload/drive/v3/files/${ID}?${params}`,
		{
			method: 'PATCH',
			body: body,
			headers: new Headers({'Content-Type': MULTIPART_CONTENT_TYPE}),
		}
	);
}


/**
 * Delete music sheet file in Google Drive
 */
async function googleApiDeleteFile()
{
	if (ID === null)
		return;

	return googleApiFetchJson(
		'Deleting music sheet',
		'Failed to delete music sheet',
		`${GOOGLE_API_BASE_URL}/drive/v3/files/${ID}`,
		{
			method: 'DELETE',
		}
	);
}


/////////////
// Toolbar //
/////////////


/**
 * Toolbar action: move the cursor left
 */
function toolMoveLeft()
{
	// Same measure
	if (cursor.column > 0) {
		cursor.column -= 1;
	}
	// Previous measure
	else if (cursor.measure > 0) {
		cursor.measure -= 1;

		const columns = getLines()[cursor.line][cursor.measure].columns;
		cursor.column = columns.length - 1;
	}
	// Previous line
	else if (cursor.line > 0) {
		cursor.line -= 1;

		const line = getLines()[cursor.line];
		cursor.measure = line.length - 1;

		const columns = line[cursor.measure].columns;
		cursor.column = columns.length - 1;
	}
	// Already the first column
	else {
		return;
	}

	updateCursor();
}



/**
 * Toolbar action: move the cursor right
 */
function toolMoveRight()
{
	// Same measure
	if (cursor.column + 1 < getColumns().length) {
		cursor.column += 1;
	}
	// Next measure
	else if (cursor.measure + 1 < getLine().length) {
		cursor.measure += 1;
		cursor.column = 0;
	}
	// Next line
	else if (cursor.line + 1 < getLines().length) {
		cursor.line += 1;
		cursor.measure = 0;
		cursor.column = 0;
	}
	else {
		addColumn();
		cursor.column += 1;
		saved = false;
		showSavedOrUnsavedUi();
	}

	updateCursor();
}


/**
 * Toolbar action: start editing the music sheet
 */
function toolEditSheet()
{
	editing = true;
	showEditingOrNotEditingUi();
}


/**
 * Toolbar action: save the music sheet
 */
async function toolSaveSheet()
{
	// Stop if already saved
	if (saved)
		return;

	// Update the sheet or stop if it failed
	const file = await googleApiPatchFile();
	if (file === null)
		return;

	// Hide this button and show the done editing button
	saved = true;
	showSavedOrUnsavedUi();
}


/**
 * Toolbar action: finish editing the music sheet
 */
function toolDoneEditingSheet()
{
	editing = false;
	showEditingOrNotEditingUi();
}


/**
 * Toolbar action: clear the current column or erase it if it's already clear
 */
function toolBackspace()
{
	// See if the column is empty
	let empty = true;
	const column = getColumn();
	for (const note of column) {
		if (note) {
			empty = false;
			break;
		}
	}

	if (empty)
		removeColumn();
	else
		clearColumn();

	saved = false;
	showSavedOrUnsavedUi();
}


/**
 * Toolbar action: show a confirmation popup to delete the music sheet
 */
function toolDeleteSheet()
{
	customAlert(`Delete sheet "${sheetName}"`, 'Keep', 'Delete', deleteSheetAndGoHome);
}


/**
 * Toolbar action: create a blank space on the music sheet
 */
function toolSpace()
{
	// Create the first new column
	addColumn();
	toolMoveRight();

	// Get position in data
	const line = getLine();
	const columns = getColumns();

	// Create another new column if it doesn't exist
	const columnRight = cursor.column + 1 < columns.length || cursor.measure + 1 < line.length;
	if (!columnRight)
		addColumn();

	toolMoveRight();

	saved = false;
	showSavedOrUnsavedUi();
}


/**
 * Toolbar action: add a measure in the music sheet
 */
function toolAddMeasure()
{
	// Change data
	const measure = {
		'beginRepeat': false,
		'endRepeat': false,
		'columns': [],
	};
	insertArrayItemAfterIndex(getLine(), cursor.measure, measure);

	cursor.measure += 1;
	cursor.column = 0;

	addColumn();

	saved = false;
	showSavedOrUnsavedUi();
}


/**
 * Toolbar action: add a line in the music sheet
 */
function toolAddLine()
{
	// Change data
	const line = [];
	insertArrayItemAfterIndex(getLines(), cursor.line, line);

	cursor.line += 1;
	cursor.measure = -1;
	cursor.column = 0;

	toolAddMeasure();

	saved = false;
	showSavedOrUnsavedUi();
}


//////////////////
// UI Callbacks //
//////////////////


/**
 *
 * @param {InputEvent} event
 */
function onInputOfTitle(event)
{
	// Change data
	if (event.target !== null)
		sheetName = /** @type {HTMLInputElement} */ (event.target).value;

	// Change UI
	updatePageTitle();
	saved = false;
	showSavedOrUnsavedUi();
}


/**
 * Update the title which appears in the tab
 */
function updatePageTitle()
{
	document.title = `${sheetName} - Music Blanket`;
}


/**
 * Delete the music sheet and go to the home page
 */
async function deleteSheetAndGoHome()
{
	await googleApiDeleteFile();
	window.location.href = HOME_PATH;
}


//////////////////////
// Arrays & Strings //
//////////////////////


/**
 * Insert an item into an array immediately after a specifc index
 * @param {any[]} array
 * @param {number} index
 * @param {any} item
 */
function insertArrayItemAfterIndex(array, index, item)
{
	array.splice(index + 1, 0, item);
}


/**
 * Remove an item from an array at a specifc index
 * @param {any[]} array
 * @param {number} index
 */
function removeArrayItem(array, index)
{
	array.splice(index, 1);
}


/**
 * Given an ASCII letter, get the next one
 * @param {string} letter
 */
function incrementLetter(letter)
{
	return String.fromCharCode(letter.charCodeAt(0) + 1);
}


////////////
// Cursor //
////////////


/**
 * Using the cursor object, update the cursor in the UI
 */
function updateCursor()
{
	/** @type {Element | null} */
	let element = null;

	// Remove id of old cursor
	if (element = document.getElementById('cursor'))
		element.removeAttribute('id');

	// Stop showing a new cursor if not editing
	if (!editing)
		return;

	// Get the cursor element
	element = document.getElementById('lines');
	if (element === null)
		return;
	element = element.children[cursor.line];
	if (element === undefined)
		return;
	element = element.children[cursor.measure];
	if (element === undefined)
		return;
	element = element.children[cursor.column];
	if (element === undefined)
		return;

	// Set id of new cursor
	element.id = 'cursor';
}


/**
 * When a column is clicked, select update the cursor to that clicked column
 * @param {PointerEvent} event
 */
function onClickColumn(event)
{
	// Get the target or fail
	/** @ts-ignore @type {HTMLElement | null} */
	const target = event.target;
	if (target === null)
		return;

	const columnDiv = target.className === 'column' ? target : target.parentElement;
	const measureDiv = columnDiv ? columnDiv.parentElement : null;
	const lineDiv = measureDiv ? measureDiv.parentElement : null;

	if (!columnDiv || !measureDiv || !lineDiv)
		return;

	// Skip when clicking the cursor
	if (columnDiv.id === 'cursor')
		return;

	cursor.column = parseInt(/** @type {string} */ (columnDiv.dataset.i));
	cursor.measure = parseInt(/** @type {string} */ (measureDiv.dataset.i));
	cursor.line = parseInt(/** @type {string} */ (lineDiv.dataset.i));

	updateCursor();
}


///////////////////
// Sheet Reading //
///////////////////


/**
 * Get all lines from the sheet data
 */
function getLines()
{
	return sheetData.lines;
}


/**
 * Using a current or new cursor, get the line from the sheet data
 * @param {{line: number, measure: number, column: number}} newCursor
 */
function getLine(newCursor=cursor)
{
	return getLines()[newCursor.line];
}


/**
 * Using a current or new cursor, get the measure from the sheet data
 * @param {{line: number, measure: number, column: number}} newCursor
 */
function getMeasure(newCursor=cursor)
{
	return getLine(newCursor)[newCursor.measure];
}


/**
 * Using a current or new cursor, get the columns from the sheet data
 * @param {{line: number, measure: number, column: number}} newCursor
 */
function getColumns(newCursor=cursor)
{
	return getMeasure(newCursor).columns;
}


/**
 * Using a current or new cursor, get the column from the sheet data
 * @param {{line: number, measure: number, column: number}} newCursor
 */
function getColumn(newCursor=cursor)
{
	return getColumns(newCursor)[newCursor.column];
}


/**
 * Get the string letter and fret number from the strings
 * @param {number} note
 * @param {number} fret
 * @returns {[letter, number]}
 */
function getNote(note, fret)
{
	let letter = STRINGS[note][0];
	let number = parseInt(STRINGS[note][1]);
	for (let i = 0; i < fret; i++) {
		// Sharp to whole
		if (letter[1] === '#')
			letter = incrementLetter(letter[0]);
		// Whole to sharp
		else if (letter in {'E':null, 'B':null})
			letter = incrementLetter(letter);
		// Whole to whole
		else
			letter += '#';

		// G# to A
		if (letter === 'H')
			letter = 'A';

		// Increase number
		if (letter === 'C')
			number++;
	}
	return [letter, number];
}


///////////////////
// Sheet Editing //
///////////////////


/**
 * Change the note on the sheet music
 * @param {number} note
 * @param {string} fret
 */
function changeNote(note, fret)
{
	// Change data
	getColumn()[note] = fret;

	// Change UI
	createSheet();
}


/**
 * Add a new column to the sheet immediately after the cursor
 */
function addColumn()
{
	// Change data
	const column = ['', '', '', '', '', ''];
	insertArrayItemAfterIndex(getColumns(), cursor.column, column);

	// Change UI
	createSheet();
}


/**
 * Clear the current column at the cursor
 */
function clearColumn()
{
	// Change data
	const column = ['', '', '', '', '', ''];
	getColumns()[cursor.column] = column;

	// Change UI
	createSheet();
}


/**
 * Remove the current column at the cursor
 */
function removeColumn()
{
	// Copy the cursor and move left
	const oldCursor = Object.assign({}, cursor);
	toolMoveLeft();

	// Get data
	const lines = getLines();
	const line = getLine(oldCursor);
	const columns = getColumns(oldCursor);

	// Change data
	// Skip if only 1 column
	if (lines.length === 1 && line.length === 1 && columns.length === 1)
		return;
	// Remove line if only 1 column on the line
	else if (line.length === 1 && columns.length === 1)
		removeArrayItem(lines, oldCursor.line);
	// Remove measure if only 1 column on the measure
	else if (columns.length === 1)
		removeArrayItem(line, oldCursor.measure);
	// Remove column
	else
		removeArrayItem(columns, oldCursor.column);

	// Change UI
	createSheet();
}


/**
 * Press the clicked fret and change the sheet music
 * @param {PointerEvent} event
 */
function onClickFret(event)
{
	/** @ts-ignore @type {HTMLElement | null} */
	const target = event.target;
	if (target === null)
		return;

	/** @ts-ignore */
	const note = parseInt(target.dataset.note);
	const fret = target.dataset.fret;
	if (fret === undefined)
		return;

	changeNote(note, fret);

	if (AUTOMATIC_MOVING)
		toolMoveRight();

	saved = false;
	showSavedOrUnsavedUi();
}


//////////////////////
// Create & Show UI //
//////////////////////


/**
 * Using the sheet data, create the music sheet in the UI
 */
function createSheet()
{
	/** @type {HTMLElement | null} */
	let element = null;

	// Squash the sheet container if editing, otherwise stretch it out
	if (element = document.getElementById('sheetContainer')) {
		if (editing) {
			element.classList.add('stretchHeight');
			element.classList.add('center');
		}
		else {
			element.classList.remove('stretchHeight');
			element.classList.remove('center');
		}
	}

	// Clear sheet
	const sheet = document.getElementById('sheet');
	if (sheet === null)
		return;
	sheet.innerHTML = '';

	// Create title
	const title = document.createElement('input');
	title.id = 'sheetTitle';
	title.className = 'sheetTitle';
	title.placeholder = 'Title';
	title.value = sheetName;
	/** @ts-ignore */
	title.oninput = onInputOfTitle;
	sheet.appendChild(title);

	// Create lines div
	const linesDiv = document.createElement('div');
	linesDiv.className = 'lines';
	linesDiv.id = 'lines';
	sheet.appendChild(linesDiv);

	// Create lines
	sheetData.lines.forEach((line, lineI) => {
		const lineDiv = document.createElement('div');
		lineDiv.className = 'line';
		if (editing)
			lineDiv.dataset.i = lineI.toString();
		linesDiv.appendChild(lineDiv);

		// Create measures
		line.forEach((measure, measureI) => {
			const measureDiv = document.createElement('div');
			measureDiv.className = 'measure';
			if (measure.beginRepeat)
				measureDiv.classList.add('beginRepeat');
			if (measure.endRepeat)
				measureDiv.classList.add('endRepeat');
			if (editing)
				measureDiv.dataset.i = measureI.toString();
			lineDiv.appendChild(measureDiv);

			// Create columns
			const columns = measure.columns;
			columns.forEach((column, columnI) => {
				const columnDiv = document.createElement('div');
				columnDiv.className = 'column';
				if (editing) {
					columnDiv.dataset.i = columnI.toString();
					/** @ts-ignore */
					columnDiv.onclick = onClickColumn;
				}
				measureDiv.appendChild(columnDiv);

				// Create notes
				for (let i = 0; i < column.length; i++) {
					const char = column[i];
					const note = document.createElement('span');
					if (char === ' ')
						note.innerHTML = '';
					else
						note.innerHTML = char;
					columnDiv.appendChild(note);
				}
			});
		});
	});

	// Update cursor
	if (editing)
		updateCursor();
}


function createFretboard(showNumbers=false)
{
	/** @type {HTMLElement | null} */
	let containerElement = null;

	// Header with fret numbers
	if (containerElement = document.getElementById('fakeString')) {
		containerElement.innerHTML = '';
		for (let i = 0; i < FRET_COUNT; i++) {
			const fret = document.createElement('span');
			fret.className = 'fret';
			fret.innerText = i.toString();
			containerElement.appendChild(fret);
		}
	}

	// Strings
	if (containerElement = document.getElementById('strings')) {
		containerElement.innerHTML = '';
		for (let i = 0; i < STRINGS.length; i++) {
			const note = document.createElement('div');
			note.className = 'note';
			containerElement.appendChild(note);

			// Frets
			for (let j = 0; j < FRET_COUNT; j++) {
				const fret = document.createElement('button');
				const [letter, number] = getNote(i, j);
				fret.className = 'fret';
				fret.innerHTML = letter + (showNumbers ? number.toString() : '');
				fret.dataset.note = i.toString();
				fret.dataset.fret = j.toString();
				/** @ts-ignore */
				fret.onclick = onClickFret;
				note.appendChild(fret);
			}
		}
	}
}


function showEditingOrNotEditingUi()
{
	/** @type {HTMLElement | null} */
	let element = null;

	// Start/stop editing the title
	if (element = document.getElementById('sheetTitle'))
		/** @type {HTMLInputElement} */ (element).readOnly = !editing;

	// Hide/show elements like the fretboard
	for (const element of document.getElementsByClassName('notEditing'))
		showElement(element, !editing);
	for (const element of document.getElementsByClassName('editing'))
		showElement(element, editing);

	showSavedOrUnsavedUi();
}


function showSavedOrUnsavedUi()
{
	/** @type {HTMLElement | null} */
	let element = null;

	// Toggle the save/done button
	if (element = document.getElementById('toolSaveSheet'))
		showElement(element, editing && !saved);
	if (element = document.getElementById('toolDoneEditingSheet'))
		showElement(element, editing && saved);

	// If unsaved, prevent navigation
	if (editing && !saved)
		window.onbeforeunload = function() { return true; };
	else
		window.onbeforeunload = null;

	updateCursor();
}


//////////
// Main //
//////////


/**
 * Main function of the page /sheet
 */
async function main()
{
	/** @type {HTMLElement | null} */
	let element = null;

	// Initialize toolbar buttons
	if (element = document.getElementById('toolLogOut'))
		element.onclick = toolLogOut;
	if (element = document.getElementById('toolMoveLeft'))
		element.onclick = toolMoveLeft;
	if (element = document.getElementById('toolMoveRight'))
		element.onclick = toolMoveRight;
	if (element = document.getElementById('toolSpace'))
		element.onclick = toolSpace;
	if (element = document.getElementById('toolAddMeasure'))
		element.onclick = toolAddMeasure;
	if (element = document.getElementById('toolAddLine'))
		element.onclick = toolAddLine;
	if (element = document.getElementById('toolBackspace'))
		element.onclick = toolBackspace;
	if (element = document.getElementById('toolDeleteSheet'))
		element.onclick = toolDeleteSheet;
	if (element = document.getElementById('toolEditSheet'))
		element.onclick = toolEditSheet;
	if (element = document.getElementById('toolSaveSheet'))
		element.onclick = toolSaveSheet;
	if (element = document.getElementById('toolDoneEditingSheet'))
		element.onclick = toolDoneEditingSheet;

	keepCookieLoop();

	// Go to home page if not logged in
	if ((await tryLoginIfNotThenShowUi()) === false) {
		window.location.href = HOME_PATH;
		return;
	}

	// Get the sheet
	let metadata, possibleSheetData;
	[metadata, possibleSheetData] = await Promise.all([
		googleApiGetFileMetadata(),
		googleApiGetFileData(),
	]);

	// Show the toolbar
	if (element = document.getElementById('tools'))
		showElement(element, true);

	// Stop if the sheet wasn't received
	if (metadata === null || possibleSheetData === null)
		return customAlert('Failed to get the music sheet', 'Ok');

	// TODO validate sheetData

	sheetData = possibleSheetData;

	// Remember the name
	sheetName = metadata.name;
	updatePageTitle();

	// Create the music sheet and fretboard UI
	createSheet();
	createFretboard();
	if (element = document.getElementById('sheetContainer'))
		showElement(element, true);
	showEditingOrNotEditingUi();
}


main();
