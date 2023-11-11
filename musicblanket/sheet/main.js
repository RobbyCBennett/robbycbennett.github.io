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


// Get music sheet file metadata in Google Drive
async function googleApiGetFileMetadata()
{
	if (ID === null)
		return null;

	const params = new URLSearchParams({
		fields: 'name',
	});

	return googleApiFetchJson(
		'Getting music sheet',
		`${GOOGLE_API_BASE_URL}/drive/v3/files/${ID}?${params}`
	);
}


// Get music sheet file data in Google Drive
async function googleApiGetFileData()
{
	if (ID === null)
		return null;

	const params = new URLSearchParams({
		alt: 'media',
	});

	return googleApiFetchJson(
		'Getting music sheet',
		`${GOOGLE_API_BASE_URL}/drive/v3/files/${ID}?${params}`
	);
}


// Update music sheet file metadata & data in Google Drive
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
		`${GOOGLE_API_BASE_URL}/upload/drive/v3/files/${ID}?${params}`,
		{
			method: 'PATCH',
			body: body,
			headers: new Headers({'Content-Type': MULTIPART_CONTENT_TYPE}),
		}
	);
}


// Delete music sheet file in Google Drive
async function googleApiDeleteFile()
{
	if (ID === null)
		return;

	return googleApiFetchJson(
		'Deleting music sheet',
		`${GOOGLE_API_BASE_URL}/drive/v3/files/${ID}`,
		{
			method: 'DELETE',
		}
	);
}


/////////////
// Toolbar //
/////////////


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


function toolEditSheet()
{
	editing = true;
	showEditingOrNotEditingUi();
}


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


function toolDoneEditingSheet()
{
	editing = false;
	showEditingOrNotEditingUi();
}


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


function toolDeleteSheet()
{
	customAlert(`Delete sheet "${sheetName}"`, 'Keep', 'Delete', deleteSheetAndGoHome);
}


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


function toolAddMeasure()
{
	// Change data
	const measure = {
		'beginRepeat': false,
		'endRepeat': false,
		'columns': [],
	};
	insertArrayItem(getLine(), cursor.measure, measure);

	cursor.measure += 1;
	cursor.column = 0;

	addColumn();

	saved = false;
	showSavedOrUnsavedUi();
}


function toolAddLine()
{
	// Change data
	const line = [];
	insertArrayItem(getLines(), cursor.line, line);

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


function onTitleChanged(e)
{
	// Change data
	sheetName = e.target.value;

	// Change UI
	updatePageTitle();
	saved = false;
	showSavedOrUnsavedUi();
}


function updatePageTitle()
{
	document.title = `${sheetName} - Music Blanket`;
}


async function deleteSheetAndGoHome()
{
	await googleApiDeleteFile();
	window.location.href = HOME_PATH;
}


//////////////////////
// Arrays & Strings //
//////////////////////


function insertArrayItem(array, index, item)
{
	array.splice(index + 1, 0, item);
}


function removeArrayItem(array, index)
{
	array.splice(index, 1);
}


function incrementLetter(letter)
{
	return String.fromCharCode(letter.charCodeAt(0) + 1);
}


////////////
// Cursor //
////////////


function updateCursor()
{
	// Get position in UI
	const oldColumn = document.getElementById('cursor');
	const lines = document.getElementById('lines');
	const line = lines.children[cursor.line];
	const measure = line.children[cursor.measure];
	const newColumn = measure.children[cursor.column];

	// Change id
	if (oldColumn)
		oldColumn.removeAttribute('id');
	newColumn.id = 'cursor';
}


function selectColumn(e)
{
	const columnDiv = e.target.className === 'column' ? e.target : e.target.parentElement;
	const measureDiv = columnDiv.parentElement;
	const lineDiv = measureDiv.parentElement;

	// Skip when clicking the cursor
	if (columnDiv.id === 'cursor')
		return;

	cursor.column = parseInt(columnDiv.dataset.i);
	cursor.measure = parseInt(measureDiv.dataset.i);
	cursor.line = parseInt(lineDiv.dataset.i);

	updateCursor();
}


///////////////////
// Sheet Reading //
///////////////////


function getLines(c=cursor)
{
	return sheetData.lines;
}


function getLine(c=cursor)
{
	return getLines(c)[c.line];
}


function getMeasure(c=cursor)
{
	return getLine(c)[c.measure];
}


function getColumns(c=cursor)
{
	return getMeasure(c).columns;
}


function getColumn(c=cursor)
{
	return getColumns(c)[c.column];
}


function getNote(note, fret)
{
	let letter = STRINGS[note][0];
	let number = STRINGS[note][1];
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
	return [letter, number.toString()];
}


///////////////////
// Sheet Editing //
///////////////////


function changeNote(note, fret)
{
	// Change data
	getColumn()[note] = fret;

	// Change UI
	createSheet();
}


function addColumn()
{
	// Change data
	const column = ['', '', '', '', '', ''];
	insertArrayItem(getColumns(), cursor.column, column);

	// Change UI
	createSheet();
}


function clearColumn()
{
	// Change data
	const column = ['', '', '', '', '', ''];
	getColumns()[cursor.column] = column;

	// Change UI
	createSheet();
}


function removeColumn()
{
	// Copy the cursor and move left
	const oldCursor = Object.assign({}, cursor);
	toolMoveLeft();

	// Get data
	const lines = getLines(oldCursor);
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


function pressFret(e)
{
	const note = e.target.dataset.note;
	const fret = e.target.dataset.fret;

	changeNote(note, fret);

	if (AUTOMATIC_MOVING)
		toolMoveRight();

	saved = false;
	showSavedOrUnsavedUi();
}


//////////////////////
// Create & Show UI //
//////////////////////


function createSheet()
{
	// Squash the sheet container if editing, otherwise stretch it out
	const sheetContainer = document.getElementById('sheetContainer');
	if (editing) {
		sheetContainer.classList.add('stretchHeight');
		sheetContainer.classList.add('center');
	}
	else {
		sheetContainer.classList.remove('stretchHeight');
		sheetContainer.classList.remove('center');
	}

	// Clear sheet
	const sheet = document.getElementById('sheet');
	sheet.innerHTML = '';

	// Create title
	const title = document.createElement('input');
	title.id = 'sheetTitle';
	title.className = 'sheetTitle';
	title.placeholder = 'Title';
	title.value = sheetName;
	title.oninput = onTitleChanged;
	sheet.appendChild(title);

	// Create lines div
	const linesDiv = document.createElement('div');
	linesDiv.className = 'lines';
	if (editing)
		linesDiv.id = 'lines';
	sheet.appendChild(linesDiv);

	// Create lines
	sheetData.lines.forEach((line, lineI) => {
		const lineDiv = document.createElement('div');
		lineDiv.className = 'line';
		if (editing)
			lineDiv.dataset.i = lineI;
		linesDiv.appendChild(lineDiv);

		// Create measures
		line.forEach((measure, measureI) => {
			const measureDiv = document.createElement('div');
			measureDiv.className = 'measure';
			if (measureDiv.beginRepeat)
				measureDiv.classList.add('beginRepeat');
			if (measureDiv.endRepeat)
				measureDiv.classList.add('endRepeat');
			if (editing)
				measureDiv.dataset.i = measureI;
			lineDiv.appendChild(measureDiv);

			// Create columns
			const columns = measure.columns;
			columns.forEach((column, columnI) => {
				const columnDiv = document.createElement('div');
				columnDiv.className = 'column';
				if (editing) {
					columnDiv.dataset.i = columnI;
					columnDiv.onclick = selectColumn;
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
	// Header with fret numbers
	const fakeString = document.getElementById('fakeString');
	fakeString.innerHTML = '';
	for (let i = 0; i < FRET_COUNT; i++) {
		const fret = document.createElement('span');
		fret.className = 'fret';
		fret.innerHTML = i;
		fakeString.appendChild(fret);
	}

	// Strings
	const stringsDiv = document.getElementById('strings');
	stringsDiv.innerHTML = '';
	for (let i = 0; i < STRINGS.length; i++) {
		const note = document.createElement('div');
		note.className = 'note';
		stringsDiv.appendChild(note);

		// Frets
		for (let j = 0; j < FRET_COUNT; j++) {
			const fret = document.createElement('button');
			const [letter, number] = getNote(i, j);
			fret.className = 'fret';
			fret.innerHTML = letter + (showNumbers ? number : '');
			fret.dataset.note = i;
			fret.dataset.fret = j;
			fret.onclick = pressFret;
			note.appendChild(fret);
		}
	}
}


function showEditingOrNotEditingUi()
{
	// Start/stop editing the title
	document.getElementById('sheetTitle').readOnly = !editing;

	// Hide/show elements like the fretboard
	for (const element of document.getElementsByClassName('notEditing'))
		showElement(element, !editing);
	for (const element of document.getElementsByClassName('editing'))
		showElement(element, editing);

	showSavedOrUnsavedUi();
}


function showSavedOrUnsavedUi()
{
	// Toggle the save/done button
	showElement(document.getElementById('toolSaveSheet'), editing && !saved);
	showElement(document.getElementById('toolDoneEditingSheet'), editing && saved);

	// If unsaved, prevent navigation
	if (editing && !saved)
		window.onbeforeunload = function() { return true; };
	else
		window.onbeforeunload = undefined;
}


//////////
// Main //
//////////


async function main()
{
	// Initialize toolbar buttons
	document.getElementById('toolLogOut').onclick = toolLogOut;
	document.getElementById('toolMoveLeft').onclick = toolMoveLeft;
	document.getElementById('toolMoveRight').onclick = toolMoveRight;
	document.getElementById('toolSpace').onclick = toolSpace;
	document.getElementById('toolAddMeasure').onclick = toolAddMeasure;
	document.getElementById('toolAddLine').onclick = toolAddLine;
	document.getElementById('toolBackspace').onclick = toolBackspace;
	document.getElementById('toolDeleteSheet').onclick = toolDeleteSheet;
	document.getElementById('toolEditSheet').onclick = toolEditSheet;
	document.getElementById('toolSaveSheet').onclick = toolSaveSheet;
	document.getElementById('toolDoneEditingSheet').onclick = toolDoneEditingSheet;

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
	showElement(document.getElementById('tools'), true);

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
	showElement(document.getElementById('sheetContainer'), true);
	showEditingOrNotEditingUi();
}


main();
