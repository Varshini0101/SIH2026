# Module 4: Money Trail & Point-of-No-Return

## Architecture

`transaction stream -> graph normalizer -> trace/PONR/risk service -> REST payload -> React SVG renderer`

The MVP uses an adjacency-list graph in `backend/services/moneyTrailService.js`. It is intentionally compatible with a NetworkX/PyG export: each node has an ID, type, risk, balance, incoming/outgoing degree, and each edge has source, target, amount, fee, channel, timestamp, hop, and `ponr`.

Node types are `ACCOUNT`, `MULE_WALLET`, `ATM`, `CRYPTO_ONRAMP`, `FOREIGN_REMITTANCE`, and `P2P_SETTLEMENT`. PONR types are terminal because the operational recovery path changes after cash-out or settlement.

## Algorithms

- **Multi-hop trace:** breadth-first traversal from a source, bounded by `maxHops`; outgoing amount divided by outgoing total gives split percentages.
- **Velocity:** `outgoing_amount / max(1, minutes(outgoing_timestamp - incoming_timestamp))`. This is a triage metric, not a forensic proof.
- **Aggregation:** incoming degree > 1; split: outgoing degree > 1; otherwise linear.
- **PONR:** an edge entering a terminal type. `TTL = max(0, ponr_timestamp - now)` in minutes. `OPEN` windows are actionable; `REACHED` means the window elapsed.
- **Amount at risk:** process timestamp-ordered edges, subtract the declared fee (or 1.5% default), propagate net balances, and separate future recoverable digital value from already-reached PONR exposure.
- **Replay:** process the same ordered stream while blocking a selected node from a chosen time. Downstream edges are suppressed and reported as saved; PONR edges that would otherwise execute are reported as prevented exposure.

## API

- `GET /api/money-trail/:caseId` returns `{ graph, ponr, amountAtRisk }`.
- `POST /api/money-trail/:caseId/replay` accepts `{ freezeNodeId, freezeAt }`.

Both routes use the existing JWT middleware. The demo graph is a deterministic adapter; replace `sampleGraph()` with the case transaction repository when the live stream is available.

## Frontend payload and visualization

The graph payload is `{ nodes: [{ id, type, risk, ponrType, aggregationPattern }], edges: [{ id, source, target, amount, timestamp, hop, ponr }] }`. The current React view uses SVG arrows so the MVP has no client dependency. A Cytoscape adapter can map `nodes` to `{ data: node }` and `edges` to `{ data: edge }`, style `node[ponrType]` red, and size edge width by `amount`.

## Python reference snippet

```python
from dataclasses import dataclass
from datetime import datetime

@dataclass(frozen=True)
class Transfer:
    source: str
    target: str
    amount: float
    timestamp: datetime
    ponr: bool = False
    fee: float = 0.0

def amount_at_risk(edges: list[Transfer], now: datetime) -> float:
    """Return net digital value that has not reached a PONR at `now`."""
    recoverable = 0.0
    balances: dict[str, float] = {}
    for edge in sorted(edges, key=lambda item: item.timestamp):
        net = max(0.0, edge.amount - edge.fee)
        balances[edge.target] = balances.get(edge.target, 0.0) + net
        if not edge.ponr and edge.timestamp > now:
            recoverable += net
    return round(recoverable, 2)
```

The production implementation is the JavaScript service because this repository runs on Node.js; the snippet defines the same timestamp ordering and fee semantics for an offline analyst notebook.
