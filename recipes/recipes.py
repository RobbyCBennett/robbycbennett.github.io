import enum
from enum import Enum


class Category(Enum):
	# Ingredient
	FRUIT = enum.auto()
	GRAIN = enum.auto()
	PROTEIN = enum.auto()
	VEGETABLE = enum.auto()
	# Kind
	DESSERT = enum.auto()
	MEAL = enum.auto()
	SNACK = enum.auto()
	# Taste
	SALTY = enum.auto()
	SAVORY = enum.auto()
	SOUR = enum.auto()
	SPICY = enum.auto()
	SWEET = enum.auto()


FRUIT = Category.FRUIT
GRAIN = Category.GRAIN
PROTEIN = Category.PROTEIN
VEGETABLE = Category.VEGETABLE
DESSERT = Category.DESSERT
MEAL = Category.MEAL
SNACK = Category.SNACK
SALTY = Category.SALTY
SAVORY = Category.SAVORY
SOUR = Category.SOUR
SPICY = Category.SPICY
SWEET = Category.SWEET


class Recipe:
	def __init__(self, name: str, author: str, quantity: str, ingredients: list[str], steps: list[str], categories: list[Category]):
		self.name: str = name
		self.author: str = author
		self.quantity: str = quantity
		self.ingredients: list[str] = ingredients
		self.steps: list[str] = steps
		self.categories: list[Category] = categories


RECIPES: list[Recipe] = [
	Recipe(
		'Asparagus',
		'Rob',
		'20 stalks',
		[
			'1 cup of water',
			'20 asparagus stalks',
			'1 tablespoon of butter',
			'Rosemary',
		],
		[
			'Steam the asparagus for 3 minutes',
			'Butter a pan',
			'Start grilling the asparagus for 2 minutes',
			'Add the rosemary',
		],
		[
			VEGETABLE,
		],
	),
	Recipe(
		'Banana Bread',
		'Rob',
		'1 loaf',
		[
			'4 overripe bananas',
			'2/3 stick of butter',
			'1/2 cup of sugar',
			'1 egg',
			'1 teaspoon of baking soda',
			'1 1/2 cups of flour',
			'1/2 cup of chocolate chips',
		],
		[
			'Preheat oven to 350 F',
			'In a bowl, mash bananas until smooth',
			'Melt the butter and mix it in',
			'Add the sugar, egg, baking soda, & flour',
			'Add the chocolate chips',
			'Pour the batter into a greased loaf pan',
			'Top with additional chocolate chips',
			'Bake for 60 minutes',
			'Loosen with a rubber spatula',
		],
		[
			DESSERT,
			FRUIT,
			GRAIN,
			SWEET,
		],
	),
	Recipe(
		'Bean Dip',
		'Ed',
		'4 servings',
		[
			'1 block of cream cheese',
			'1 small can of chili',
			'1 small can of refried beans',
			'10 drops of vinegar hot sauce',
		],
		[
			'Get a big bowl for warming',
			'Mix in all of the ingredients',
		],
		[
			PROTEIN,
			SAVORY,
			SNACK,
			SPICY,
		],
	),
	Recipe(
		'Cheese Sauce',
		'Rob',
		'2 cups',
		[
			'1 Tbsp of butter',
			'1 Tbsp of flour',
			'1/2 cup of milk',
			'2 cups of freshly shredded cheese',
		],
		[
			'Put a metal bowl in a pot of water',
			'Warm it at a medium-high heat',
			'Melt the butter until golden brown',
			'Whisk in the flour, quickly and vertically',
			'Whisk in the milk the same way',
			'Mix in the cheese the same way',
		],
		[
			SAVORY,
			SNACK,
		],
	),
	Recipe(
		'Chicken Casserole',
		'Rob',
		'6 servings',
		[
			'3 thawed chicken breasts',
			'2/3 stick of butter',
			'4 cups of brown rice',
			'8 cups of water',
			'1 whole broccoli',
			'Another 8 cups of water',
			'1/2 cup of sour cream',
			'1/2 cup of milk',
			'1 cup of shredded cheese',
			'Pepper',
			'Garlic powder',
			'Salt',
			'Parsley',
		],
		[
			'Wash the rice',
			'Cook the rice in water for 60 minutes',
			'Preheat the oven to 375 F',
			'Butter the chicken and bake it for 45 minutes',
			'Cook the brocolli in water for 3 minutes',
			'Slice the brocolli branches in half',
			'Shred the chicken',
			'Mix the chicken, broccoli, & rice in a deep pan',
			'Bake the casserole for 15 minutes',
			'Mix in the shredded cheese and sour cream',
			'Season the top of the casserole',
		],
		[
			GRAIN,
			MEAL,
			PROTEIN,
			SAVORY,
			SOUR,
		],
	),
	Recipe(
		'Chocolate Chip Cookies',
		'Rob',
		'12 cookies',
		[
			'2 cups chocolate chips',
			'3 cups wheat flour',
			'2 cups brown sugar',
			'1 tsp baking soda',
			'2 eggs',
			'2 sticks of butter',
		],
		[
			'Preheat the oven to 350 F',
			'Melt the butter in a pot',
			'Mix it all in no particular order',
			'Make dough balls on unoiled trays',
			'Bake for 12 minutes',
		],
		[
			DESSERT,
			SWEET,
		],
	),
	Recipe(
		'Hash Browns',
		'Rob',
		'4 waffles',
		[
			'3 potatoes',
			'Cooking spray',
			'Oil',
		],
		[
			'Grate potatoes into a giant bowl of water',
			'Strain',
			'Spray the cooking spray and add 1 Tbsp oil',
			'Cook with ventilated top at 208 F for 12 minutes',
			'Add 1 Tbsp oil to uncooked side',
			'Flip and cook other side for 12 minutes',
		],
		[
			SALTY,
			SNACK,
		],
	),
	Recipe(
		'Waffles',
		'Rob',
		'4 waffles',
		[
			'1 cup of whole wheat flour',
			'1 tsp of baking powder',
			'1 egg',
			'1 cup of milk',
			'1 Tbsp of vegetable oil',
			'2 Tbsp of brown sugar',
			'3 shakes of cinnamon',
		],
		[
			'Start the waffle iron at medium-low heat',
			'Mix the ingredients in a big bowl',
			'Pour with a ladle',
		],
		[
			GRAIN,
			SNACK,
			SWEET,
		],
	),
]
