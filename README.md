# Mesa Tower BAS

A building automation front end in the style of the operator workstations used for commercial HVAC controls. It runs entirely in the browser against a simulated plant: one variable-air-volume air handler (AHU-1) serving six zones.

Open `index.html` in a browser. There is no build step and no dependencies.

## What is in it

- **Floor plan** with thermographic zone colors. Each zone is colored by how far it sits from its setpoint, and you can select a zone to change its setpoint.
- **AHU-1 graphic** with live dampers, coils, fan and point values, a BACnet-style point list, operator setpoints, and fault injection (tripped fan, stuck chilled water valve, loaded filter).
- **Logic** page that shows the control programs as function blocks with live values on the wires. PID gains are editable.
- **Trends** for the last 24 simulated hours, logged every 5 minutes.
- **Alarms** with delays, return to normal, and acknowledgement.

## Sequence of operations

- **Occupancy**: schedule 06:00 to 18:00, with operator override.
- **Night setback**: when unoccupied, the unit cycles on if any zone passes 82 °F or 62 °F and runs until every zone is 2 °F back inside those limits. On a setback heating cycle the outside air damper stays shut and cooling is locked out.
- **Proof of airflow**: if the fan is commanded on with no run status for 60 s, the valves close, the outside air damper shuts and the return damper opens. VAV reheat is locked out without airflow.
- **Supply fan**: starts on occupancy. A PI loop modulates the VFD to hold duct static pressure (default 1.0 in. w.c.).
- **Supply air temperature**: one PI loop drives a sequencer. Hot water valve, then outside air damper (economizer), then chilled water valve, to hold 55 °F.
- **Economizer**: enabled when outside air is below 65 °F and at least 2 °F below return air, with 2 °F hysteresis. Otherwise the damper holds 20 % minimum outside air.
- **VAV zones**: each box runs a cooling PI loop on its damper (25 % minimum flow) and a heating PI loop on its reheat valve, around a ±1 °F deadband. Unoccupied limits are 82 / 62 °F.

## Development

- `sh build.sh` assembles `src/page.html` and `index.html` from `src/parts/`. Edit the parts, not the built files.
- `npm test` runs the plant and controller model headless (Node 20 or newer, no dependencies) and checks the sequence of operations: setpoint control, the economizer, night setback, and each fault.
- CI runs the tests and fails if the built pages are out of date.

Operator setpoints, PID gains and zone setpoints are saved in the browser's local storage. Everything else restarts with the model on reload.

## What this is not

This is a simulator. Nothing in it talks to real equipment. To put this front end on a real building you would need, at minimum:

- a data layer that reads and writes points over BACnet/IP or a vendor gateway, in place of the model;
- user accounts, permissions and an audit trail for every setpoint change and override;
- a server-side historian for trends and alarms, with alarm routing;
- graphics and point lists generated per site rather than hard-coded.

The UI reads one state object (`S`, created by `makeSim()` in `src/parts/2-sim.html`) and the model advances it with `step(S)`. Replacing `step` with a poller that fills the same fields is the seam for live data.

## Layout

- `index.html` is the standalone page.
- `src/page.html` is the same page without the document wrapper, assembled from `src/parts/` (markup and styles, plant model, UI). The plant and controller model has no DOM dependencies.

The plant model is a simplified lumped-parameter simulation for demonstration. It is not a design tool.
