One skill in a skill tree, in three states: learned, available and locked.

**Use** `.sk` with `.own`, `.can` or `.lock`, and set `--tc` to the tree's color: Brawler `neon`, Gunslinger `gold`, Mage `karma`, Decker `mana`. Inside: `.sk-n` name (`node` style), `.sk-d` effect (one sentence with a number), and for locked nodes `.sk-l` saying exactly what unlocks it.

**States:** learned = tree-color border and name with ✓; available = `gold` border that pulses (off with reduced motion); locked = 50% opacity. Learning one pops it once (0.6s).
