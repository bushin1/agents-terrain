# LevelChip

Shows an agent's level: Bronze (start), Silver (5+ validated visits, +10%), Gold (15+, +20%).

- **Provide:** `<span class="mc-level mc-level--{bronze|silver|gold}">` with the level name, and the bonus when it helps ("Silver +10%").
- Pair with a level-progress card that states the gap in visits ("2 more visits to Silver") and what it unlocks, never a percentage alone.
- Each level has its own text/background pair (`level-*` / `level-*-soft`) at ≥4.7:1. The ring dot is decoration; the word carries the meaning.
- Levels are a bonus, never a quota: no "you'll lose Silver" warnings.
