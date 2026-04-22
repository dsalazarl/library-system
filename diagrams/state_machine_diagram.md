```mermaid
---
title: Library System - State Machine Diagram
---
stateDiagram-v2
    [*] --> Available

    Available --> Reserved
    Available --> Borrowed : direct loan

    Reserved --> Available : expired (1h)
    Reserved --> Borrowed : user borrows

    Borrowed --> Available : returned
    Borrowed --> Overdue : after 2 days

    Borrowed --> PendingTransfer
    PendingTransfer --> Borrowed : cancelled/rejected
    PendingTransfer --> Borrowed : accepted (new owner)

    Overdue --> Available : returned
```
