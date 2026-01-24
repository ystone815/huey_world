import json
import math

# Bonfire position
BONFIRE_X = 80
BONFIRE_Y = 50
CLEAR_RADIUS = 350  # About 10 steps

# Load the map
with open('db/map/forest.json', 'r') as f:
    trees = json.load(f)

print(f"Original tree count: {len(trees)}")

# Filter out trees too close to bonfire
filtered_trees = []
removed_count = 0

for tree in trees:
    distance = math.sqrt((tree['x'] - BONFIRE_X)**2 + (tree['y'] - BONFIRE_Y)**2)
    if distance >= CLEAR_RADIUS:
        filtered_trees.append(tree)
    else:
        removed_count += 1
        print(f"Removed tree at ({tree['x']}, {tree['y']}) - distance: {distance:.1f}px")

print(f"\nRemoved {removed_count} trees near bonfire")
print(f"New tree count: {len(filtered_trees)}")

# Save the updated map
with open('db/map/forest.json', 'w') as f:
    json.dump(filtered_trees, f, indent=2)

print("\nMap updated successfully!")
