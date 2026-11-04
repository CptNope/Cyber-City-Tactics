# The Sprawl

An open-world street of doors to crack, one block at a time (`G.world`, `G.wd`). Each block is generated from its level and a seed (`genStreet()`), so a shared seed rebuilds the same block.

```mermaid
flowchart TD
  ST[The street: cops patrol by heat] -->|door| HK{"locked? hack it<br/>(Hacking widens the window)"}
  HK -->|fail| LOCK["lockout + heat"]
  HK -->|in| RM[rooms: fights, chests, hostages, hazards, vaults]
  RM --> BOSS[a boss on tier 2+ buildings]
  BOSS --> OUT[back to the street with loot]
  OUT --> ETH{"was it fair game?"}
  ETH -->|"corps, gangs, clubs"| GOOD[street cred up]
  ETH -->|"homes, corner shops"| BAD["cred down, heat up"]
  ST --> NEXT[next block: harder, new events]
```

## Buildings

"Fair game" is what `isGood()` returns for the building type. A Lone Star precinct counts as good only once your street cred reaches +30, and dirty businesses only once they're revealed.

| Building type | Ethics | Usual foes | Tier-3 extras | Bosses by tier |
|---|---|---|---|---|
| hideout | fair game | Ganger, Orc bruiser, Street shaman | Ghoul, Riot trooper, Hellhound | Crew lieutenant / Crew boss / Crew warlord |
| blacksite | fair game | Corp security, Riot trooper, Drone | ICE sentry, Glitch, Kagemori shadow, Kagemori mech walker | Site chief / Research director / Vault ICE |
| business | off limits | Corp security, Drone | Riot trooper | Head of security / Head of security |
| home | off limits |  |  |  |
| club | fair game | Ganger, Orc bruiser | Street shaman, Hellhound | Head bouncer / Head bouncer / Club owner |
| precinct | off limits | Patrol officer, Drone, Riot trooper | Riot trooper, Corp security | Watch commander / Watch commander / Watch commander |
| dirty | off limits | Corp security, Orc bruiser, Ganger | Riot trooper | Bodyguard / Bodyguard / Bodyguard |
| secret | fair game | Street shaman, Ghoul, Fire spirit, Feral spirit | Glitch | Lantern keeper / Lantern keeper / Wyrm priest |

## Block events

| Key | Block event | What happens |
|---|---|---|
| gangwar | Gang war | The crews are fighting over the block. Patrols come twice as often and hideouts pay double street cred. |
| blackout | Blackout | The grid is down. No cops can find you, locks are easier to crack, and it is very dark. |
| lockdown | Kagemori lockdown | Every black site is locked at tier 3 with better loot, and heat cools half as fast. |
| festival | Night market | Lantern festival on the block. Shops are 20% cheaper and vending machines line the street. |
| acidrain | Acid rain | Toxic rain eats at everyone out on the street, gangers included: 1 HP every two seconds. Indoors is dry. |
| parade | Corp parade | Kagemori is celebrating. Patrols walk the block even with no heat, but every takedown pays 50% more creds. |
| spiritstorm | Spirit storm | The astral is boiling over. Wild spirits drift down the block, and every spell costs half the mana. |
| manhunt | Manhunt | Someone put a price on your head. Bounty hunters come for you now and then, and each one carries a fat payout. |

Also on the street: heat (0–5 stars; cops, then drones and riot cops), street cred, Sable's black-market cart, Juno's bounty building, Kagemori courier drones, hidden doors, and the Lantern Vault once all 24 lore shards are found.

## Day and night

`w.clock` counts steps on the block (street and buildings, `clockTick` in modes/sprawl.js); each half of the day is `DAY_STEPS` (10,800 steps, three minutes). `isNight(w)` is the odd halves. The clock is saved with the block.

```mermaid
stateDiagram-v2
  [*] --> Day
  Day --> Night: 3 minutes, or "Wait for nightfall" at the safehouse
  Night --> Day: 3 minutes, or "Sleep till morning"
```

| | Day | Night |
|---|---|---|
| Cops (heat timer) | normal | a third slower (`copT` skips every third step) |
| Gang patrols | normal | 1.6× as often, one more ganger |
| Caches | normal | creds ×1.25, one more piece of gear |
| Clinic and talisman shop | open | shut (`shopShut`), "CLOSED TILL DAWN" |
| Break-ins on bad buildings | heat + 1 (witnesses) | normal heat |
| Look | warm wash | cold wash, lamplight around runners (`drawTimeOfDay`) |

## The block remembers

Worked out from `w.looted`, so nothing new needs saving:

| What | Effect | Cap |
|---|---|---|
| `cleared(w)`: hideouts and clubs looted | shops ×0.9 each, door reads CLEARED | 3 (−30%) |
| `robbed(w)`: bad homes and businesses looted | shops ×1.1 each, BOARDED UP with planks | 3 (+30%) |

`blockMul(w)` feeds `buyMul()`. `w.prog[building id]` is the room you last entered (`enterRoom`); `enterBuilding` resumes there, so leaving halfway (or quitting) doesn't restock the rooms you already cleared.

## Turrets and hacking in a fight

`DEF.turret` is a `heavy` (never flinches, falls or gets grabbed) sentry that `turretTick` runs: it slides along the back wall toward its target's lane and fires a bullet down it. Black sites and precincts get one in their inner rooms 65% of the time.

```mermaid
flowchart LR
  F[Drone or turret] --> O{"hackOpen: stunT > 0, under 40% HP, or shock-stunned"}
  O -- no --> F
  O -- yes, runner PUNCHes beside it --> R{"roll < hackChance(p)"}
  R -- yes, drone --> D[Gone; an allied drone for 20 s]
  R -- yes, turret --> T["team 0 for 1,200 steps (turretTick targets foes)"]
  R -- no --> Z[Runner zapped; hackLock 90 steps]
```

`hackChance(p)` is 0.45 + 0.06 × Hacking (cyberdeck included), +0.15 for deckers, capped at 0.95. Couriers and bosses can't be hacked. The Decker archetype's Overload and the Decker tree's Short Circuit set `stunT` on machines, which opens the window.
