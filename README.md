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
- **Supply fan**: starts on occupancy. A PI loop modulates the VFD to hold duct static pressure (default 1.0 in. w.c.).
- **Supply air temperature**: one PI loop drives a sequencer. Hot water valve, then outside air damper (economizer), then chilled water valve, to hold 55 °F.
- **Economizer**: enabled when outside air is below 65 °F and at least 2 °F below return air, with 2 °F hysteresis. Otherwise the damper holds 20 % minimum outside air.
- **VAV zones**: each box runs a cooling PI loop on its damper (25 % minimum flow) and a heating PI loop on its reheat valve, around a ±1 °F deadband. Unoccupied setbacks are 82 / 62 °F.

## Layout

- `index.html` is the standalone page.
- `src/page.html` is the same page without the document wrapper. The plant and controller model is the `<script id="sim">` block and has no DOM dependencies.

The plant model is a simplified lumped-parameter simulation for demonstration. It is not a design tool.
