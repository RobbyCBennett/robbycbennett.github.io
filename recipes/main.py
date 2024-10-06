#! /usr/bin/env python3


import os


from recipes import *


def to_lower_recipe(recipe: Recipe) -> str:
	return recipe.name.lower().replace(' ', '-')


def lower_and_title_category(category: Category) -> (str, str):
	category = category.name.lower()
	return (f'{category}-recipes', f'{category[0].upper()}{category[1:]}')


def to_li_string(strings: list[str]) -> str:
	parts: list[str] = []
	for string in strings:
		parts.append(f'<li>{string}</li>')
	return '\n\t\t\t\t'.join(parts)


def to_a_string_categories(categories: list[Category]) -> str:
	parts: list[str] = []
	for category in categories:
		lower, title = lower_and_title_category(category)
		parts.append(f"<a href='/recipes/{lower}'>{title}</a>")
	return '\n\t\t\t\t'.join(parts)


def to_li_a_string_recipes(recipes: list[Recipe]) -> str:
	parts: list[str] = []
	for recipe in recipes:
		parts.append(f"<li><a href='/recipes/{to_lower_recipe(recipe)}'>{recipe.name}</a></li>")
	return '\n\t\t\t\t'.join(parts)


def to_li_a_string_categories(categories: list[Category]) -> str:
	parts: list[str] = []
	for category in categories:
		lower, title = lower_and_title_category(category)
		parts.append(f"<li><a href='/recipes/{lower}'>{title}</a></li>")
	return '\n\t\t\t\t'.join(parts)


def main():
	recipe_links: list[str] = []

	categories: dict[Category, list[Recipe]] = dict()

	expected_folders: set[str] = {'__pycache__', 'assets'}

	header = f'''<header class='box'>
			<h1><a href='/recipes'>Recipes</a></h1>
			<p>Ingredient</p>
			<ul class='spread'>
				{to_li_a_string_categories([FRUIT, GRAIN, PROTEIN, VEGETABLE])}
			</ul>
			<p>Kind</p>
			<ul class='spread'>
				{to_li_a_string_categories([DESSERT, MEAL, SNACK])}
			</ul>
			<p>Taste</p>
			<ul class='spread'>
				{to_li_a_string_categories([SALTY, SAVORY, SOUR, SPICY, SWEET])}
			</ul>
		</header>'''

	# Make each recipe page
	for recipe in RECIPES:
		folder = to_lower_recipe(recipe)
		expected_folders.add(folder)
		recipe_links.append(f"<li><a href='/recipes/{folder}'>{recipe.name}</a></li>")
		for category in recipe.categories:
			if category not in categories:
				categories[category] = [recipe]
			else:
				categories[category].append(recipe)
		os.makedirs(folder, exist_ok=True)
		file = open(f'{folder}/index.html', 'w')
		file.write(f'''\
<!DOCTYPE html>
<html lang='en' dir='ltr'>
	<head>
		<meta charset='utf-8'>
		<meta name='viewport' content='width=device-width, initial-scale=1'>

		<title>Recipes - {recipe.name}</title>
		<meta name='description' content='View {recipe.name} in my recipe collection'>

		<link rel='icon' type='image/svg+xml' href='/recipes/assets/logo.svg'>
		<link rel='stylesheet' href='/recipes/style.css'>
		<link as='font' href='/recipes/assets/libreBaskerville.woff2' rel='preload' crossorigin='anonymous'>
	</head>

	<body>
		<div class='box'>
			<h1>{recipe.name}</h1>
			<span>by {recipe.author}</span>
			<p>{recipe.quantity}</p>
			<ul class='ingredients'>
				{to_li_string(recipe.ingredients)}
			</ul>
			<ol>
				{to_li_string(recipe.steps)}
			</ol>
			<div class='horizontal'>
				{to_a_string_categories(recipe.categories)}
			</div>
		</div>
		{header}
	</body>
</html>''')
		file.close()

	# Make each category page
	for category, category_recipes in categories.items():
		lower, title = lower_and_title_category(category)
		expected_folders.add(lower)
		os.makedirs(lower, exist_ok=True)
		file = open(f'{lower}/index.html', 'w')
		file.write(f'''\
<!DOCTYPE html>
<html lang='en' dir='ltr'>
	<head>
		<meta charset='utf-8'>
		<meta name='viewport' content='width=device-width, initial-scale=1'>

		<title>Recipes - {title} Recipes</title>
		<meta name='description' content='View the {title} category in my recipe collection'>

		<link rel='icon' type='image/svg+xml' href='/recipes/assets/logo.svg'>
		<link rel='stylesheet' href='/recipes/style.css'>
		<link as='font' href='/recipes/assets/libreBaskerville.woff2' rel='preload' crossorigin='anonymous'>
	</head>

	<body>
		<div class='box'>
			<h1>{title} Recipes</h1>
			<ul class='spread'>
				{to_li_a_string_recipes(category_recipes)}
			</ul>
		</div>
		{header}
	</body>
</html>''')
		file.close()

	# Delete any old pages
	for folder in os.scandir():
		if folder.name in expected_folders:
			continue
		if not folder.is_dir():
			continue
		os.remove(f'{folder.name}/index.html')
		os.rmdir(folder.name)

	# Make the home page
	file = open('index.html', 'w')
	recipe_links = '\n\t\t\t\t'.join(recipe_links)
	file.write(f'''\
<!DOCTYPE html>
<html lang='en' dir='ltr'>
	<head>
		<meta charset='utf-8'>
		<meta name='viewport' content='width=device-width, initial-scale=1'>

		<title>Recipes</title>
		<meta name='description' content='View my recipe collection'>

		<link rel='icon' type='image/svg+xml' href='/recipes/assets/logo.svg'>
		<link rel='stylesheet' href='/recipes/style.css'>
		<link as='font' href='/recipes/assets/libreBaskerville.woff2' rel='preload' crossorigin='anonymous'>
	</head>

	<body id='home'>
		{header}
		<div class='box'>
			<h1>All Recipes</h1>
			<ul class='spread'>
				{recipe_links}
			</ul>
		</div>
	</body>
</html>''')
	file.close()


if __name__ == '__main__':
	main()
