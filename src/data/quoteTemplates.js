/**
 * Quote Templates — Industry-specific service libraries for Invoice King
 * Each template contains: name, icon, color, description, and a full services array
 * Services have: id, name, description, unit, defaultPrice, category
 */

export const QUOTE_TEMPLATES = {
  hvac: {
    id: 'hvac',
    name: 'HVAC',
    icon: '❄️',
    color: '#C8E20A',
    description: 'Heating, Ventilation & Air Conditioning',
    notes: 'Prices shown are per unit/job. Labor rate: $125/hr. Service call fee applied toward repair if work is completed. Parts carry a 1-year manufacturer warranty. Labor warranted for 90 days.',
    paymentTerms: 'Net 30. 50% deposit required to schedule. Balance due upon completion. Late payments subject to 1.5% monthly interest.',
    sections: [
      {
        name: 'Labor Rates',
        services: [
          { id: 'hvac-labor-hr', name: 'HVAC Labor — Hourly Rate', description: 'Standard hourly rate for HVAC repair, maintenance, or installation labor', unit: 'per hour', defaultPrice: 125 },
          { id: 'hvac-labor-trip', name: 'Service / Trip Charge', description: 'Diagnostic visit fee — applied toward repair if work is completed same day', unit: 'per visit', defaultPrice: 89 },
          { id: 'hvac-labor-after-hr', name: 'After-Hours / Emergency Rate', description: 'Weekend, holiday, or after-hours service rate', unit: 'per hour', defaultPrice: 185 },
        ]
      },
      {
        name: 'Diagnostic & Inspection',
        services: [
          { id: 'hvac-diag', name: 'HVAC System Diagnostic', description: 'Full inspection of heating and cooling system, identify issues', unit: 'per visit', defaultPrice: 89 },
          { id: 'hvac-tune', name: 'AC Tune-Up & Maintenance', description: 'Seasonal tune-up, coil cleaning, refrigerant check, filter replacement', unit: 'per unit', defaultPrice: 149 },
          { id: 'hvac-heat-tune', name: 'Heating Tune-Up & Maintenance', description: 'Furnace/heat pump inspection, cleaning, efficiency check', unit: 'per unit', defaultPrice: 129 },
          { id: 'hvac-duct', name: 'Duct Inspection & Leak Test', description: 'Pressure test ductwork, identify leaks and inefficiencies', unit: 'per system', defaultPrice: 199 },
        ]
      },
      {
        name: 'Repairs',
        services: [
          { id: 'hvac-refrig', name: 'Refrigerant Recharge (R-410A)', description: 'Locate leak, recharge refrigerant to manufacturer spec', unit: 'per lb', defaultPrice: 75 },
          { id: 'hvac-compressor', name: 'Compressor Replacement', description: 'Remove and replace failed compressor, includes labor', unit: 'per unit', defaultPrice: 1400 },
          { id: 'hvac-motor', name: 'Blower Motor Replacement', description: 'Replace faulty blower motor, test operation', unit: 'each', defaultPrice: 450 },
          { id: 'hvac-cap', name: 'Capacitor Replacement', description: 'Replace failed start/run capacitor', unit: 'each', defaultPrice: 175 },
          { id: 'hvac-contactor', name: 'Contactor Replacement', description: 'Replace worn or failed contactor', unit: 'each', defaultPrice: 145 },
          { id: 'hvac-thermostat', name: 'Thermostat Replacement', description: 'Install new programmable or smart thermostat', unit: 'each', defaultPrice: 225 },
          { id: 'hvac-coil', name: 'Evaporator Coil Replacement', description: 'Replace failed evaporator coil, includes refrigerant', unit: 'per unit', defaultPrice: 1800 },
          { id: 'hvac-valve', name: 'Expansion Valve Replacement', description: 'Replace TXV or orifice tube', unit: 'each', defaultPrice: 350 },
        ]
      },
      {
        name: 'Installation',
        services: [
          { id: 'hvac-ac-install', name: 'Central AC Installation', description: 'Install new central air conditioning system (labor only)', unit: 'per system', defaultPrice: 2400 },
          { id: 'hvac-heat-install', name: 'Furnace Installation', description: 'Install new gas or electric furnace (labor only)', unit: 'per system', defaultPrice: 1800 },
          { id: 'hvac-mini-split', name: 'Mini-Split Installation', description: 'Install ductless mini-split unit, single zone', unit: 'per zone', defaultPrice: 1200 },
          { id: 'hvac-duct-install', name: 'Ductwork Installation', description: 'Install new flex or rigid ductwork per linear foot', unit: 'per linear ft', defaultPrice: 18 },
          { id: 'hvac-filter-sub', name: 'Filter Subscription (Quarterly)', description: 'Quarterly filter replacement service visits', unit: 'per quarter', defaultPrice: 89 },
        ]
      },
      {
        name: 'Indoor Air Quality',
        services: [
          { id: 'hvac-iaq', name: 'Air Purifier Installation', description: 'Install whole-home UV air purifier', unit: 'each', defaultPrice: 695 },
          { id: 'hvac-humid', name: 'Humidifier Installation', description: 'Install whole-home humidifier with auto-controls', unit: 'each', defaultPrice: 550 },
          { id: 'hvac-duct-clean', name: 'Duct Cleaning', description: 'Full duct system cleaning, per vent', unit: 'per vent', defaultPrice: 35 },
        ]
      },
    ]
  },

  electrical: {
    id: 'electrical',
    name: 'Electrical',
    icon: '⚡',
    color: '#64748B',
    description: 'Licensed Electrical Contracting Services',
    notes: 'All work performed by licensed electricians and complies with NEC code. Permits pulled as required. Work carries 1-year labor warranty.',
    paymentTerms: 'Net 15. Payment due upon project completion. We accept check, cash, and all major credit cards.',
    sections: [
      {
        name: 'Labor Rates',
        services: [
          { id: 'elec-labor-hr', name: 'Electrician Labor — Hourly Rate', description: 'Licensed electrician hourly rate for repairs, installation, and service calls', unit: 'per hour', defaultPrice: 135 },
          { id: 'elec-labor-trip', name: 'Service / Trip Charge', description: 'Service call fee — applied toward work if completed same day', unit: 'per visit', defaultPrice: 95 },
          { id: 'elec-labor-after', name: 'After-Hours / Emergency Rate', description: 'Weekend, holiday, or emergency electrical service', unit: 'per hour', defaultPrice: 200 },
        ]
      },
      {
        name: 'Diagnostic & Inspection',
        services: [
          { id: 'elec-diag', name: 'Electrical Diagnostic', description: 'Troubleshoot and diagnose electrical issues', unit: 'per visit', defaultPrice: 95 },
          { id: 'elec-inspect', name: 'Home Electrical Inspection', description: 'Full panel, wiring, and outlet inspection with report', unit: 'per home', defaultPrice: 249 },
          { id: 'elec-afci', name: 'AFCI/GFCI Testing', description: 'Test all AFCI and GFCI breakers and outlets', unit: 'per home', defaultPrice: 149 },
        ]
      },
      {
        name: 'Panel & Service',
        services: [
          { id: 'elec-panel-upgrade', name: 'Panel Upgrade (200A)', description: 'Upgrade to 200-amp main service panel', unit: 'per panel', defaultPrice: 2800 },
          { id: 'elec-panel-100', name: 'Panel Upgrade (100A)', description: 'Upgrade to 100-amp service panel', unit: 'per panel', defaultPrice: 1800 },
          { id: 'elec-breaker', name: 'Circuit Breaker Replacement', description: 'Replace faulty circuit breaker', unit: 'each', defaultPrice: 145 },
          { id: 'elec-sub-panel', name: 'Sub-Panel Installation', description: 'Install 60A–100A sub-panel with new circuits', unit: 'each', defaultPrice: 1600 },
          { id: 'elec-grounding', name: 'Grounding/Bonding Service', description: 'Install or upgrade grounding system', unit: 'per system', defaultPrice: 450 },
        ]
      },
      {
        name: 'Wiring & Circuits',
        services: [
          { id: 'elec-circuit', name: 'New Circuit Installation', description: 'Run new 15A or 20A circuit with outlet', unit: 'per circuit', defaultPrice: 350 },
          { id: 'elec-240v', name: '240V Circuit Installation', description: 'Run new 240V circuit for appliance or EV charger', unit: 'per circuit', defaultPrice: 550 },
          { id: 'elec-rewire-room', name: 'Room Rewiring', description: 'Rewire single room, replace wiring and outlets', unit: 'per room', defaultPrice: 800 },
          { id: 'elec-knob-tube', name: 'Knob & Tube Replacement', description: 'Replace outdated knob-and-tube wiring per room', unit: 'per room', defaultPrice: 1200 },
        ]
      },
      {
        name: 'Outlets, Switches & Fixtures',
        services: [
          { id: 'elec-outlet', name: 'Outlet Installation/Replacement', description: 'Install new or replace existing outlet', unit: 'each', defaultPrice: 95 },
          { id: 'elec-gfci-outlet', name: 'GFCI Outlet Installation', description: 'Install GFCI outlet in kitchen, bath, or exterior', unit: 'each', defaultPrice: 125 },
          { id: 'elec-switch', name: 'Switch Installation/Replacement', description: 'Install single, 3-way, or dimmer switch', unit: 'each', defaultPrice: 85 },
          { id: 'elec-fan', name: 'Ceiling Fan Installation', description: 'Install ceiling fan with light kit on existing box', unit: 'each', defaultPrice: 175 },
          { id: 'elec-fixture', name: 'Light Fixture Installation', description: 'Install interior light fixture on existing junction box', unit: 'each', defaultPrice: 125 },
          { id: 'elec-recess', name: 'Recessed Light Installation', description: 'Install recessed can lighting, per fixture', unit: 'each', defaultPrice: 225 },
        ]
      },
      {
        name: 'Specialty & EV',
        services: [
          { id: 'elec-ev', name: 'EV Charger Installation (Level 2)', description: 'Install 240V Level 2 EV charging station', unit: 'each', defaultPrice: 650 },
          { id: 'elec-generator', name: 'Generator Connection', description: 'Install transfer switch and connect generator', unit: 'per system', defaultPrice: 1400 },
          { id: 'elec-surge', name: 'Whole-Home Surge Protector', description: 'Install panel-level surge protection device', unit: 'each', defaultPrice: 395 },
          { id: 'elec-smoke', name: 'Smoke/CO Detector Installation', description: 'Install hardwired combination smoke/CO detector', unit: 'each', defaultPrice: 145 },
        ]
      },
    ]
  },

  plumbing: {
    id: 'plumbing',
    name: 'Plumbing',
    icon: '🔧',
    color: '#3b82f6',
    description: 'Licensed Plumbing Services',
    notes: 'All work performed by licensed plumbers. Parts carry manufacturer warranty. Labor warranted for 1 year. Permits obtained as required by local code.',
    paymentTerms: 'Payment due upon completion. Emergency service rates apply outside normal business hours.',
    sections: [
      {
        name: 'Labor Rates',
        services: [
          { id: 'plumb-labor-hr', name: 'Plumber Labor — Hourly Rate', description: 'Licensed plumber hourly rate for service, repair, and installation', unit: 'per hour', defaultPrice: 125 },
          { id: 'plumb-labor-trip', name: 'Service / Trip Charge', description: 'Minimum service call fee — credited toward repair', unit: 'per visit', defaultPrice: 89 },
          { id: 'plumb-labor-after', name: 'After-Hours / Emergency Plumbing', description: 'Emergency service outside normal business hours', unit: 'per hour', defaultPrice: 195 },
        ]
      },
      {
        name: 'Diagnostic & Inspection',
        services: [
          { id: 'plumb-diag', name: 'Plumbing Diagnostic / Leak Search', description: 'Identify source of leak or plumbing issue', unit: 'per visit', defaultPrice: 89 },
          { id: 'plumb-camera', name: 'Sewer Camera Inspection', description: 'Camera inspection of drain or sewer line with video', unit: 'per line', defaultPrice: 299 },
          { id: 'plumb-hydro', name: 'Hydrostatic Pressure Test', description: 'Test plumbing system for leaks under pressure', unit: 'per test', defaultPrice: 199 },
        ]
      },
      {
        name: 'Drain & Sewer',
        services: [
          { id: 'plumb-drain-clear', name: 'Drain Cleaning (Kitchen/Bath)', description: 'Snake and clear stopped kitchen or bathroom drain', unit: 'per drain', defaultPrice: 175 },
          { id: 'plumb-sewer-clean', name: 'Main Sewer Line Cleaning', description: 'Hydro-jet or snake main sewer line', unit: 'per line', defaultPrice: 450 },
          { id: 'plumb-sewer-repair', name: 'Sewer Line Repair', description: 'Excavate and repair damaged sewer line section', unit: 'per job', defaultPrice: 2200 },
          { id: 'plumb-trench', name: 'Sewer Line Replacement', description: 'Full sewer line replacement to street (per linear ft)', unit: 'per linear ft', defaultPrice: 85 },
          { id: 'plumb-root', name: 'Root Removal', description: 'Remove tree root intrusion from drain or sewer line', unit: 'per job', defaultPrice: 350 },
        ]
      },
      {
        name: 'Repairs',
        services: [
          { id: 'plumb-faucet', name: 'Faucet Repair/Replacement', description: 'Repair or replace leaking kitchen or bath faucet', unit: 'each', defaultPrice: 185 },
          { id: 'plumb-toilet', name: 'Toilet Repair (Flapper/Fill Valve)', description: 'Repair running or leaking toilet internals', unit: 'each', defaultPrice: 145 },
          { id: 'plumb-toilet-replace', name: 'Toilet Replacement', description: 'Remove old toilet, install customer-supplied unit', unit: 'each', defaultPrice: 285 },
          { id: 'plumb-pipe-repair', name: 'Pipe Leak Repair', description: 'Repair burst or leaking pipe section', unit: 'per repair', defaultPrice: 275 },
          { id: 'plumb-shutoff', name: 'Shut-Off Valve Replacement', description: 'Replace angle stop or ball valve', unit: 'each', defaultPrice: 145 },
        ]
      },
      {
        name: 'Water Heater',
        services: [
          { id: 'plumb-wh-replace', name: 'Water Heater Replacement (40 gal)', description: 'Remove old, install new 40-gallon gas water heater', unit: 'each', defaultPrice: 1100 },
          { id: 'plumb-wh-tankless', name: 'Tankless Water Heater Install', description: 'Install gas tankless water heater with gas line work', unit: 'each', defaultPrice: 2400 },
          { id: 'plumb-wh-flush', name: 'Water Heater Flush & Tune', description: 'Flush sediment, check anode rod, test pressure relief', unit: 'each', defaultPrice: 149 },
        ]
      },
      {
        name: 'Fixture & Installation',
        services: [
          { id: 'plumb-sink', name: 'Sink Installation', description: 'Install kitchen or bathroom sink and drain', unit: 'each', defaultPrice: 375 },
          { id: 'plumb-shower', name: 'Shower Valve Replacement', description: 'Replace pressure-balance or thermostatic shower valve', unit: 'each', defaultPrice: 450 },
          { id: 'plumb-softener', name: 'Water Softener Installation', description: 'Install whole-home water softener system', unit: 'each', defaultPrice: 850 },
          { id: 'plumb-filter', name: 'Whole-Home Water Filter Install', description: 'Install whole-house sediment/carbon filter system', unit: 'each', defaultPrice: 650 },
        ]
      },
    ]
  },

  handyman: {
    id: 'handyman',
    name: 'Handyman',
    icon: '🔨',
    color: '#C8E20A',
    description: 'General Handyman & Home Repair Services',
    notes: 'Customer supplies materials unless otherwise noted. Labor warranted for 30 days. Scheduling within 1-3 business days.',
    paymentTerms: 'Payment due upon completion. Minimum 2-hour labor charge applies.',
    sections: [
      {
        name: 'Labor',
        services: [
          { id: 'hm-hour', name: 'Hourly Handyman Labor', description: 'General handyman labor, minimum 2 hours', unit: 'per hour', defaultPrice: 85 },
          { id: 'hm-half-day', name: 'Half-Day Service (4 Hours)', description: '4-hour block, handles multiple small projects', unit: 'per block', defaultPrice: 320 },
          { id: 'hm-full-day', name: 'Full-Day Service (8 Hours)', description: '8-hour block for larger or multiple projects', unit: 'per day', defaultPrice: 600 },
        ]
      },
      {
        name: 'Interior Repairs',
        services: [
          { id: 'hm-drywall', name: 'Drywall Patch (Small)', description: 'Patch and texture drywall hole up to 6"', unit: 'each', defaultPrice: 125 },
          { id: 'hm-drywall-lg', name: 'Drywall Patch (Large)', description: 'Patch and texture drywall hole 6"–24"', unit: 'each', defaultPrice: 225 },
          { id: 'hm-door-hang', name: 'Door Hanging & Adjustment', description: 'Hang, adjust, or plane interior door', unit: 'each', defaultPrice: 150 },
          { id: 'hm-trim', name: 'Trim/Baseboard Installation', description: 'Install baseboards, door casing, or crown per linear ft', unit: 'per linear ft', defaultPrice: 6 },
          { id: 'hm-caulk', name: 'Caulking (Bath/Kitchen)', description: 'Remove old and apply new caulk around tub, shower, or counters', unit: 'per area', defaultPrice: 95 },
          { id: 'hm-tile', name: 'Tile Repair/Grout (Small Area)', description: 'Replace broken tiles or regrout small area', unit: 'per sq ft', defaultPrice: 12 },
        ]
      },
      {
        name: 'Exterior & Misc',
        services: [
          { id: 'hm-fence', name: 'Fence Repair (Per Panel)', description: 'Repair or replace damaged fence section or post', unit: 'per panel', defaultPrice: 175 },
          { id: 'hm-gutter', name: 'Gutter Cleaning & Inspection', description: 'Clean gutters and downspouts, check for damage', unit: 'per 50 lin ft', defaultPrice: 150 },
          { id: 'hm-deck', name: 'Deck Repair (Board Replacement)', description: 'Replace damaged deck boards, per board', unit: 'each', defaultPrice: 85 },
          { id: 'hm-assemble', name: 'Furniture Assembly', description: 'Assemble flat-pack furniture per piece', unit: 'per item', defaultPrice: 75 },
          { id: 'hm-tv-mount', name: 'TV Mounting', description: 'Mount TV on wall, connect cables, conceal wires', unit: 'each', defaultPrice: 125 },
          { id: 'hm-blinds', name: 'Window Blind/Shade Installation', description: 'Install blinds or shades per window', unit: 'each', defaultPrice: 55 },
        ]
      },
    ]
  },

  construction: {
    id: 'construction',
    name: 'Construction',
    icon: '🏗️',
    color: '#64748B',
    description: 'General Construction & Renovation',
    notes: 'All work performed per local building codes. Licensed and insured. Permits obtained as required. Schedule subject to material availability.',
    paymentTerms: 'Draw schedule: 30% mobilization, 30% at framing/rough-in, 30% at substantial completion, 10% at final walkthrough.',
    sections: [
      {
        name: 'Site Work & Demo',
        services: [
          { id: 'con-demo', name: 'Interior Demo (Per Room)', description: 'Full gut demo: drywall, flooring, fixtures', unit: 'per room', defaultPrice: 1200 },
          { id: 'con-haul', name: 'Debris Removal / Haul Away', description: 'Remove and haul construction debris, per load', unit: 'per load', defaultPrice: 350 },
          { id: 'con-grade', name: 'Site Grading & Prep', description: 'Grade and prepare site for construction', unit: 'per sq ft', defaultPrice: 2 },
        ]
      },
      {
        name: 'Framing & Structure',
        services: [
          { id: 'con-frame', name: 'Framing (Wood Frame)', description: 'Wood frame walls, floor, or roof per sq ft', unit: 'per sq ft', defaultPrice: 12 },
          { id: 'con-addition', name: 'Room Addition', description: 'Add room with foundation, framing, roofline (per sq ft)', unit: 'per sq ft', defaultPrice: 185 },
          { id: 'con-beam', name: 'Load-Bearing Beam Installation', description: 'Install LVL or steel beam, includes shoring', unit: 'each', defaultPrice: 3500 },
        ]
      },
      {
        name: 'Drywall & Finishes',
        services: [
          { id: 'con-drywall', name: 'Drywall Hang & Tape', description: 'Hang, tape, and mud drywall per sq ft', unit: 'per sq ft', defaultPrice: 3.5 },
          { id: 'con-texture', name: 'Texture & Finish', description: 'Apply texture coat and finish to walls', unit: 'per sq ft', defaultPrice: 1.5 },
          { id: 'con-trim', name: 'Interior Trim Package', description: 'Install doors, casing, baseboards throughout', unit: 'per room', defaultPrice: 650 },
        ]
      },
      {
        name: 'Roofing',
        services: [
          { id: 'con-roof-repair', name: 'Roof Repair (Minor)', description: 'Patch leaks, replace damaged shingles', unit: 'per sq', defaultPrice: 450 },
          { id: 'con-roof-replace', name: 'Roof Replacement (Asphalt)', description: 'Full tear-off and replacement, 30-yr shingles', unit: 'per sq', defaultPrice: 550 },
          { id: 'con-roof-gutter', name: 'Gutter & Fascia Replacement', description: 'Replace gutters and fascia board per linear ft', unit: 'per linear ft', defaultPrice: 22 },
        ]
      },
    ]
  },

  generalContractor: {
    id: 'generalContractor',
    name: 'General Contractor',
    icon: '📋',
    color: '#10b981',
    description: 'Full-Service General Contracting',
    notes: 'GC fee covers project management, scheduling, permits, and trade coordination. All subcontractors are licensed and insured.',
    paymentTerms: 'Standard draw schedule based on project milestones. Retainage of 10% held through project closeout.',
    sections: [
      {
        name: 'Project Management',
        services: [
          { id: 'gc-pm', name: 'GC Project Management Fee', description: 'Project management and general contracting fee (% of cost)', unit: '% of project', defaultPrice: 15 },
          { id: 'gc-design', name: 'Design-Build Coordination', description: 'Coordinate with architect/designer, manage plans', unit: 'per project', defaultPrice: 2500 },
          { id: 'gc-permit', name: 'Permit Expediting', description: 'Pull and manage required construction permits', unit: 'per permit', defaultPrice: 450 },
          { id: 'gc-inspection', name: 'Inspection Coordination', description: 'Schedule and manage all required inspections', unit: 'per project', defaultPrice: 750 },
        ]
      },
      {
        name: 'Kitchen Remodel',
        services: [
          { id: 'gc-kitchen-basic', name: 'Kitchen Remodel (Basic)', description: 'Cabinets, countertops, backsplash, fixtures (labor)', unit: 'per project', defaultPrice: 18000 },
          { id: 'gc-kitchen-mid', name: 'Kitchen Remodel (Mid-Range)', description: 'Semi-custom cabinets, quartz counters, full update', unit: 'per project', defaultPrice: 35000 },
          { id: 'gc-kitchen-high', name: 'Kitchen Remodel (Luxury)', description: 'Custom cabinets, premium appliances, full gut renovation', unit: 'per project', defaultPrice: 75000 },
          { id: 'gc-cabinet', name: 'Cabinet Installation', description: 'Install kitchen or bath cabinets per linear foot', unit: 'per linear ft', defaultPrice: 150 },
          { id: 'gc-countertop', name: 'Countertop Installation', description: 'Install granite, quartz, or laminate countertop', unit: 'per sq ft', defaultPrice: 85 },
        ]
      },
      {
        name: 'Bathroom Remodel',
        services: [
          { id: 'gc-bath-basic', name: 'Bathroom Remodel (Basic)', description: 'Tub/shower, vanity, toilet, tile (labor)', unit: 'per project', defaultPrice: 8500 },
          { id: 'gc-bath-mid', name: 'Bathroom Remodel (Mid-Range)', description: 'Walk-in shower, custom tile, new fixtures', unit: 'per project', defaultPrice: 18000 },
          { id: 'gc-bath-master', name: 'Master Bath Renovation', description: 'Full gut, double vanity, large tile shower, soaker tub', unit: 'per project', defaultPrice: 35000 },
        ]
      },
      {
        name: 'Additions & ADUs',
        services: [
          { id: 'gc-addition', name: 'Home Addition (per sq ft)', description: 'Full turn-key addition with permits', unit: 'per sq ft', defaultPrice: 220 },
          { id: 'gc-adu', name: 'ADU / Garage Conversion', description: 'Convert existing space to ADU with full amenities', unit: 'per sq ft', defaultPrice: 195 },
          { id: 'gc-basement', name: 'Basement Finish', description: 'Frame, drywall, flooring, electrical, HVAC', unit: 'per sq ft', defaultPrice: 75 },
        ]
      },
    ]
  },

  insurance: {
    id: 'insurance',
    name: 'Insurance Restoration',
    icon: '🏠',
    color: '#C8E20A',
    description: 'Insurance Claim & Restoration Services',
    notes: 'All restoration work follows Xactimate pricing guidelines. Work order issued upon claim approval. Photos and documentation provided for all work.',
    paymentTerms: 'Payment assigned from insurance carrier. Deductible due at project start. Supplemental claims processed as needed.',
    sections: [
      {
        name: 'Emergency Services',
        services: [
          { id: 'ins-board', name: 'Board Up Service', description: 'Emergency board up of windows, doors after damage', unit: 'per opening', defaultPrice: 185 },
          { id: 'ins-tarp', name: 'Roof Tarping', description: 'Emergency tarp to prevent further water intrusion', unit: 'per sq', defaultPrice: 95 },
          { id: 'ins-extract', name: 'Water Extraction', description: 'Emergency water extraction per day', unit: 'per day', defaultPrice: 650 },
          { id: 'ins-dry', name: 'Structural Drying (Per Day)', description: 'Deploy drying equipment, monitor moisture levels', unit: 'per day', defaultPrice: 450 },
        ]
      },
      {
        name: 'Mitigation',
        services: [
          { id: 'ins-mold', name: 'Mold Remediation (Small Area)', description: 'Remediate mold growth under 100 sq ft', unit: 'per project', defaultPrice: 1800 },
          { id: 'ins-mold-lg', name: 'Mold Remediation (Large Area)', description: 'Remediate mold growth over 100 sq ft', unit: 'per sq ft', defaultPrice: 28 },
          { id: 'ins-asbestos', name: 'Asbestos Testing & Abatement', description: 'Test and remediate asbestos-containing materials', unit: 'per sample', defaultPrice: 450 },
          { id: 'ins-content', name: 'Content Pack-Out & Storage', description: 'Pack, inventory, and store contents during restoration', unit: 'per room', defaultPrice: 750 },
        ]
      },
      {
        name: 'Structural Repair',
        services: [
          { id: 'ins-roof', name: 'Roof Replacement (Hail/Wind)', description: 'Full roof replacement, Xactimate priced', unit: 'per sq', defaultPrice: 550 },
          { id: 'ins-siding', name: 'Siding Replacement', description: 'Replace damaged siding panels per sq ft', unit: 'per sq ft', defaultPrice: 9 },
          { id: 'ins-window', name: 'Window Replacement', description: 'Replace broken or damaged window unit', unit: 'each', defaultPrice: 550 },
          { id: 'ins-drywall', name: 'Drywall Repair / Replacement', description: 'Replace water or fire-damaged drywall per sq ft', unit: 'per sq ft', defaultPrice: 4.5 },
          { id: 'ins-floor', name: 'Flooring Replacement', description: 'Replace damaged flooring per sq ft', unit: 'per sq ft', defaultPrice: 8 },
        ]
      },
      {
        name: 'Smoke & Fire',
        services: [
          { id: 'ins-smoke', name: 'Smoke Cleaning / Deodorizing', description: 'Clean and deodorize smoke-affected surfaces', unit: 'per room', defaultPrice: 450 },
          { id: 'ins-ozone', name: 'Ozone Treatment', description: 'Ozone treatment to eliminate smoke odor', unit: 'per treatment', defaultPrice: 550 },
        ]
      },
    ]
  },

  flooring: {
    id: 'flooring',
    name: 'Flooring',
    icon: '🏡',
    color: '#a78bfa',
    description: 'Professional Flooring Installation & Repair',
    notes: 'Includes labor only unless noted. Materials selected and purchased separately. Subfloor prep billed at time and material if required.',
    paymentTerms: '50% deposit to schedule installation. Balance due upon completion.',
    sections: [
      {
        name: 'Hardwood',
        services: [
          { id: 'floor-hw-install', name: 'Hardwood Installation', description: 'Install solid or engineered hardwood, nail-down or glue', unit: 'per sq ft', defaultPrice: 6 },
          { id: 'floor-hw-sand', name: 'Hardwood Sanding & Refinishing', description: 'Sand and refinish existing hardwood floors', unit: 'per sq ft', defaultPrice: 4.5 },
          { id: 'floor-hw-repair', name: 'Hardwood Plank Repair', description: 'Replace damaged hardwood planks, per plank', unit: 'per plank', defaultPrice: 45 },
        ]
      },
      {
        name: 'Luxury Vinyl Plank (LVP)',
        services: [
          { id: 'floor-lvp', name: 'LVP Installation (Click-Lock)', description: 'Install LVP flooring, floating installation', unit: 'per sq ft', defaultPrice: 4.5 },
          { id: 'floor-lvp-glue', name: 'LVP Installation (Glue-Down)', description: 'Install LVP flooring with adhesive', unit: 'per sq ft', defaultPrice: 5.5 },
        ]
      },
      {
        name: 'Tile',
        services: [
          { id: 'floor-tile', name: 'Tile Installation (Floor)', description: 'Install ceramic or porcelain floor tile', unit: 'per sq ft', defaultPrice: 8 },
          { id: 'floor-tile-large', name: 'Large Format Tile Installation', description: 'Install large format tile (24"+ tiles)', unit: 'per sq ft', defaultPrice: 11 },
          { id: 'floor-tile-demo', name: 'Tile Demo & Disposal', description: 'Remove and dispose of existing tile', unit: 'per sq ft', defaultPrice: 3 },
          { id: 'floor-grout', name: 'Grout Repair / Recoloring', description: 'Regrout or recolor grout lines per sq ft', unit: 'per sq ft', defaultPrice: 6 },
        ]
      },
      {
        name: 'Carpet',
        services: [
          { id: 'floor-carpet', name: 'Carpet Installation', description: 'Install carpet, pad included in pricing', unit: 'per sq yd', defaultPrice: 12 },
          { id: 'floor-carpet-remove', name: 'Carpet Removal & Disposal', description: 'Remove existing carpet and haul away', unit: 'per sq ft', defaultPrice: 1.5 },
          { id: 'floor-carpet-stretch', name: 'Carpet Stretching / Repair', description: 'Re-stretch buckled carpet or repair seams', unit: 'per room', defaultPrice: 145 },
        ]
      },
      {
        name: 'Subfloor & Prep',
        services: [
          { id: 'floor-subfloor', name: 'Subfloor Repair / Replacement', description: 'Replace damaged subfloor decking per sq ft', unit: 'per sq ft', defaultPrice: 6 },
          { id: 'floor-level', name: 'Floor Leveling (Self-Leveler)', description: 'Apply self-leveling compound to uneven subfloor', unit: 'per sq ft', defaultPrice: 4 },
          { id: 'floor-transition', name: 'Transition Strip Installation', description: 'Install threshold or transition strip per linear ft', unit: 'per linear ft', defaultPrice: 12 },
        ]
      },
    ]
  },

  pressureWashing: {
    id: 'pressureWashing',
    name: 'Pressure Washing',
    icon: '💧',
    color: '#06b6d4',
    description: 'Professional Pressure & Soft Washing',
    notes: 'Eco-friendly cleaning solutions used on all soft-wash services. Water sourced from property. Services subject to weather conditions.',
    paymentTerms: 'Payment due upon completion. Discounts available for recurring service agreements.',
    sections: [
      {
        name: 'Residential',
        services: [
          { id: 'pw-house', name: 'House Soft Wash (Exterior)', description: 'Soft wash entire home exterior, kill algae and mold', unit: 'per sq ft', defaultPrice: 0.30 },
          { id: 'pw-drive', name: 'Driveway Pressure Washing', description: 'Pressure wash concrete or asphalt driveway', unit: 'per sq ft', defaultPrice: 0.20 },
          { id: 'pw-deck', name: 'Deck / Patio Washing', description: 'Pressure wash wood deck or concrete patio', unit: 'per sq ft', defaultPrice: 0.25 },
          { id: 'pw-fence', name: 'Fence Washing', description: 'Soft or pressure wash wood, vinyl, or metal fence', unit: 'per linear ft', defaultPrice: 1.50 },
          { id: 'pw-roof', name: 'Roof Soft Wash', description: 'Safely soft wash roof to remove algae/lichen', unit: 'per sq ft', defaultPrice: 0.45 },
          { id: 'pw-gutter', name: 'Gutter Brightening / Flush', description: 'Flush gutters and brighten exterior faces', unit: 'per linear ft', defaultPrice: 3.50 },
          { id: 'pw-sidewalk', name: 'Sidewalk / Walkway Washing', description: 'Pressure wash concrete or paver walkways', unit: 'per sq ft', defaultPrice: 0.20 },
          { id: 'pw-window', name: 'Window Washing (Exterior)', description: 'Clean exterior windows including frames and sills', unit: 'per window', defaultPrice: 8 },
        ]
      },
      {
        name: 'Commercial',
        services: [
          { id: 'pw-parking', name: 'Parking Lot / Parking Garage', description: 'Pressure wash commercial parking surface', unit: 'per sq ft', defaultPrice: 0.12 },
          { id: 'pw-building', name: 'Commercial Building Wash', description: 'Soft or pressure wash commercial building exterior', unit: 'per sq ft', defaultPrice: 0.22 },
          { id: 'pw-graffiti', name: 'Graffiti Removal', description: 'Remove graffiti from building or hard surface', unit: 'per sq ft', defaultPrice: 4.50 },
          { id: 'pw-fleet', name: 'Fleet / Vehicle Washing', description: 'Wash commercial vehicle fleet per vehicle', unit: 'per vehicle', defaultPrice: 45 },
        ]
      },
    ]
  },

  junkRemoval: {
    id: 'junkRemoval',
    name: 'Junk Removal',
    icon: '🚛',
    color: '#78716c',
    description: 'Junk Removal & Hauling Services',
    notes: 'Environmentally responsible disposal. Items are sorted for donation, recycling, or proper disposal. Final price confirmed on-site before work begins.',
    paymentTerms: 'Payment due upon completion of service.',
    sections: [
      {
        name: 'Load Pricing',
        services: [
          { id: 'junk-min', name: 'Minimum Load (⅛ Truck)', description: 'Small load: a few boxes, small items', unit: 'per load', defaultPrice: 99 },
          { id: 'junk-quarter', name: 'Quarter Truck Load', description: 'Equivalent to 1-2 sofas or 10-15 boxes', unit: 'per load', defaultPrice: 175 },
          { id: 'junk-half', name: 'Half Truck Load', description: 'Equivalent to one small room of furniture', unit: 'per load', defaultPrice: 275 },
          { id: 'junk-three-quarter', name: 'Three-Quarter Truck Load', description: 'Equivalent to most of a studio apartment', unit: 'per load', defaultPrice: 375 },
          { id: 'junk-full', name: 'Full Truck Load', description: 'Complete 16-yard truck, any items accepted', unit: 'per load', defaultPrice: 499 },
        ]
      },
      {
        name: 'Specialty Items',
        services: [
          { id: 'junk-appliance', name: 'Appliance Removal', description: 'Remove and haul major appliance (washer, dryer, fridge)', unit: 'each', defaultPrice: 75 },
          { id: 'junk-mattress', name: 'Mattress Removal', description: 'Remove and responsibly dispose of mattress', unit: 'each', defaultPrice: 65 },
          { id: 'junk-tv', name: 'TV / Electronics Disposal', description: 'E-waste certified disposal of TVs and electronics', unit: 'each', defaultPrice: 55 },
          { id: 'junk-tire', name: 'Tire Disposal', description: 'Remove and dispose of tires properly', unit: 'each', defaultPrice: 25 },
          { id: 'junk-hot-tub', name: 'Hot Tub / Spa Removal', description: 'Drain, disassemble, and remove hot tub', unit: 'each', defaultPrice: 450 },
          { id: 'junk-demo', name: 'Light Demo & Removal', description: 'Demo and haul away decks, fences, sheds', unit: 'per job', defaultPrice: 550 },
        ]
      },
      {
        name: 'Cleanouts',
        services: [
          { id: 'junk-estate', name: 'Estate Cleanout', description: 'Full home or estate cleanout, all items removed', unit: 'per day', defaultPrice: 1200 },
          { id: 'junk-storage', name: 'Storage Unit Cleanout', description: 'Empty storage unit, sort for donation/disposal', unit: 'per unit', defaultPrice: 350 },
          { id: 'junk-garage', name: 'Garage Cleanout', description: 'Full garage cleanout and haul away', unit: 'per garage', defaultPrice: 450 },
          { id: 'junk-hoarder', name: 'Hoarder Home Cleanout', description: 'Sensitive cleanout, sort valuables, multiple loads', unit: 'per day', defaultPrice: 1800 },
        ]
      },
    ]
  },

  treeService: {
    id: 'treeService',
    name: 'Tree Service',
    icon: '🌳',
    color: '#C8E20A',
    description: 'Professional Tree Care & Removal',
    notes: 'All work performed by ISA-certified arborists. Fully insured. Hazardous tree assessments provided in writing. Debris removal included unless noted.',
    paymentTerms: 'Payment due upon completion. Large removal projects may require 50% deposit.',
    sections: [
      {
        name: 'Tree Removal',
        services: [
          { id: 'tree-remove-sm', name: 'Small Tree Removal (under 30 ft)', description: 'Remove small tree, includes stump cut to grade', unit: 'each', defaultPrice: 450 },
          { id: 'tree-remove-md', name: 'Medium Tree Removal (30–60 ft)', description: 'Remove medium tree, section cut as needed', unit: 'each', defaultPrice: 950 },
          { id: 'tree-remove-lg', name: 'Large Tree Removal (60+ ft)', description: 'Remove large or hazardous tree', unit: 'each', defaultPrice: 1800 },
          { id: 'tree-remove-emerg', name: 'Emergency Tree Removal', description: 'Storm response, 24/7, limb or tree on structure', unit: 'per job', defaultPrice: 1500 },
        ]
      },
      {
        name: 'Trimming & Pruning',
        services: [
          { id: 'tree-trim-sm', name: 'Tree Trimming (Small)', description: 'Prune and shape small ornamental tree', unit: 'each', defaultPrice: 250 },
          { id: 'tree-trim-md', name: 'Tree Trimming (Medium)', description: 'Crown clean and reduce medium tree', unit: 'each', defaultPrice: 550 },
          { id: 'tree-trim-lg', name: 'Tree Trimming (Large)', description: 'Structural pruning on large canopy tree', unit: 'each', defaultPrice: 950 },
          { id: 'tree-dead-wood', name: 'Deadwood Removal', description: 'Remove dead, dying, or dangerous branches', unit: 'per hour', defaultPrice: 125 },
          { id: 'tree-hedge', name: 'Hedge Trimming', description: 'Trim hedges or large shrubs per linear ft', unit: 'per linear ft', defaultPrice: 5 },
        ]
      },
      {
        name: 'Stump Services',
        services: [
          { id: 'tree-stump-grind', name: 'Stump Grinding', description: 'Grind stump to 6" below grade per inch of diameter', unit: 'per inch diameter', defaultPrice: 3 },
          { id: 'tree-stump-remove', name: 'Stump Removal (Excavation)', description: 'Excavate and remove stump and root ball', unit: 'each', defaultPrice: 650 },
        ]
      },
      {
        name: 'Tree Health',
        services: [
          { id: 'tree-consult', name: 'Arborist Consultation', description: 'On-site tree health assessment and written report', unit: 'per visit', defaultPrice: 150 },
          { id: 'tree-inject', name: 'Deep Root Fertilization', description: 'High-pressure injection of nutrients at root zone', unit: 'per tree', defaultPrice: 185 },
          { id: 'tree-spray', name: 'Insect / Disease Treatment', description: 'Apply treatment for specific pest or disease', unit: 'per tree', defaultPrice: 125 },
          { id: 'tree-cable', name: 'Tree Cabling / Bracing', description: 'Install cable support for weak branch unions', unit: 'per cable', defaultPrice: 350 },
        ]
      },
    ]
  },

  painting: {
    id: 'painting',
    name: 'Painting',
    icon: '🎨',
    color: '#C8E20A',
    description: 'Interior & Exterior Painting',
    notes: 'Two coats applied on all surfaces unless noted. Contractor supplies all paint (premium brand included). Furniture moved and covered. Light cleaning after completion.',
    paymentTerms: '30% deposit to schedule. 70% due upon project completion.',
    sections: [
      {
        name: 'Interior Painting',
        services: [
          { id: 'paint-room', name: 'Interior Room Painting', description: 'Walls only, 2 coats, includes prep and trim', unit: 'per room', defaultPrice: 450 },
          { id: 'paint-sqft', name: 'Interior Painting (Per Sq Ft)', description: 'Walls and ceiling, all prep included', unit: 'per sq ft', defaultPrice: 2.50 },
          { id: 'paint-ceiling', name: 'Ceiling Painting', description: 'Paint ceiling only, 2 coats', unit: 'per sq ft', defaultPrice: 1.25 },
          { id: 'paint-trim', name: 'Trim / Baseboard Painting', description: 'Paint baseboards, door and window casings', unit: 'per linear ft', defaultPrice: 2.50 },
          { id: 'paint-door', name: 'Interior Door Painting', description: 'Paint both sides of interior door', unit: 'each', defaultPrice: 85 },
          { id: 'paint-cabinet', name: 'Cabinet Painting (per door)', description: 'Spray paint cabinet doors and faces, per door', unit: 'per door', defaultPrice: 65 },
        ]
      },
      {
        name: 'Exterior Painting',
        services: [
          { id: 'paint-ext-house', name: 'Exterior House Paint (Per Sq Ft)', description: 'Full exterior paint, all siding, includes prep', unit: 'per sq ft', defaultPrice: 2.75 },
          { id: 'paint-ext-trim', name: 'Exterior Trim Painting', description: 'Paint fascia, soffits, and window trim', unit: 'per linear ft', defaultPrice: 3.50 },
          { id: 'paint-ext-deck', name: 'Deck Stain / Paint', description: 'Stain or paint wood deck surface per sq ft', unit: 'per sq ft', defaultPrice: 2.25 },
          { id: 'paint-ext-fence', name: 'Fence Stain / Paint', description: 'Spray stain or paint wood fence per linear ft', unit: 'per linear ft', defaultPrice: 3 },
          { id: 'paint-ext-door', name: 'Exterior Door Painting', description: 'Paint exterior door, includes prep', unit: 'each', defaultPrice: 125 },
          { id: 'paint-ext-garage', name: 'Garage Door Painting', description: 'Paint single or double garage door', unit: 'each', defaultPrice: 175 },
        ]
      },
      {
        name: 'Specialty',
        services: [
          { id: 'paint-epoxy', name: 'Epoxy Floor Coating', description: 'Apply 2-part epoxy coating to garage or basement floor', unit: 'per sq ft', defaultPrice: 5 },
          { id: 'paint-wallpaper', name: 'Wallpaper Removal', description: 'Remove wallpaper and prep walls per sq ft', unit: 'per sq ft', defaultPrice: 2 },
          { id: 'paint-texture', name: 'Wall Texture Application', description: 'Apply knock-down, orange peel, or smooth finish', unit: 'per sq ft', defaultPrice: 1.75 },
        ]
      },
    ]
  },

  concrete: {
    id: 'concrete',
    name: 'Concrete & Masonry',
    icon: '🧱',
    color: '#71717a',
    description: 'Concrete Flatwork, Foundations & Masonry',
    notes: 'All concrete meets or exceeds 3000 PSI compressive strength. Reinforced with rebar or fiber as required. Proper cure time required before loading.',
    paymentTerms: 'Concrete flatwork: 50% deposit, balance on pour day. Masonry: progress billing per milestone.',
    sections: [
      {
        name: 'Flatwork',
        services: [
          { id: 'con-drive', name: 'Concrete Driveway', description: 'Pour 4" reinforced concrete driveway per sq ft', unit: 'per sq ft', defaultPrice: 9 },
          { id: 'con-patio', name: 'Concrete Patio', description: 'Pour 4" reinforced concrete patio per sq ft', unit: 'per sq ft', defaultPrice: 8 },
          { id: 'con-walk', name: 'Sidewalk / Walkway', description: 'Pour 4" concrete sidewalk per sq ft', unit: 'per sq ft', defaultPrice: 8 },
          { id: 'con-slab', name: 'Concrete Slab (Shed/Garage)', description: 'Pour monolithic slab with vapor barrier', unit: 'per sq ft', defaultPrice: 7 },
          { id: 'con-steps', name: 'Concrete Steps', description: 'Form and pour concrete entry steps', unit: 'per step', defaultPrice: 350 },
        ]
      },
      {
        name: 'Foundation',
        services: [
          { id: 'con-found-pour', name: 'Foundation / Footing Pour', description: 'Form and pour concrete foundation or footings', unit: 'per linear ft', defaultPrice: 125 },
          { id: 'con-found-repair', name: 'Foundation Crack Repair', description: 'Epoxy or polyurethane injection crack repair', unit: 'per linear ft', defaultPrice: 50 },
          { id: 'con-waterproof', name: 'Foundation Waterproofing', description: 'Apply exterior waterproof membrane and drainage board', unit: 'per sq ft', defaultPrice: 12 },
        ]
      },
      {
        name: 'Masonry',
        services: [
          { id: 'mas-brick', name: 'Brick Laying / Installation', description: 'Install standard brick, includes mortar and labor', unit: 'per sq ft', defaultPrice: 25 },
          { id: 'mas-block', name: 'CMU Block Wall', description: 'Install concrete masonry unit wall per sq ft', unit: 'per sq ft', defaultPrice: 18 },
          { id: 'mas-tuckpoint', name: 'Tuckpointing / Repointing', description: 'Remove and repoint deteriorated mortar joints', unit: 'per sq ft', defaultPrice: 14 },
          { id: 'mas-chimney', name: 'Chimney Repair / Rebuild', description: 'Rebuild chimney crown or repair brick and mortar', unit: 'per job', defaultPrice: 1500 },
          { id: 'mas-retaining', name: 'Retaining Wall (Block)', description: 'Install segmental block retaining wall per sq ft face', unit: 'per sq ft', defaultPrice: 28 },
          { id: 'mas-paver', name: 'Paver Installation', description: 'Install brick or concrete paver patio or walkway', unit: 'per sq ft', defaultPrice: 18 },
        ]
      },
      {
        name: 'Removal & Repair',
        services: [
          { id: 'con-demo', name: 'Concrete Demo & Removal', description: 'Break up and haul old concrete per sq ft', unit: 'per sq ft', defaultPrice: 4 },
          { id: 'con-crack', name: 'Concrete Crack Repair', description: 'Fill and seal concrete cracks per linear ft', unit: 'per linear ft', defaultPrice: 12 },
          { id: 'con-level', name: 'Mudjacking / Slab Lifting', description: 'Lift settled concrete slab with mudjack or foam', unit: 'per sq ft', defaultPrice: 6 },
        ]
      },
    ]
  },

  farming: {
    id: 'farming',
    name: 'Cattle & Farming',
    icon: '🐄',
    color: '#C8E20A',
    description: 'Agricultural & Livestock Services',
    notes: 'Services provided by experienced agricultural professionals. Livestock handling follows humane care standards. Farm visits require advance scheduling.',
    paymentTerms: 'Net 30 for established accounts. New clients: payment due at service. Seasonal contracts available.',
    sections: [
      {
        name: 'Livestock Care',
        services: [
          { id: 'farm-vet', name: 'On-Farm Veterinary Call', description: 'Farm visit by licensed vet or technician', unit: 'per visit', defaultPrice: 125 },
          { id: 'farm-preg', name: 'Pregnancy Check (Ultrasound)', description: 'Ultrasound pregnancy confirmation per animal', unit: 'per head', defaultPrice: 25 },
          { id: 'farm-brand', name: 'Branding / Ear Tagging', description: 'Brand or tag cattle for identification per head', unit: 'per head', defaultPrice: 18 },
          { id: 'farm-dehorn', name: 'Dehorning / Tipping', description: 'Remove or tip horns, per animal', unit: 'per head', defaultPrice: 35 },
          { id: 'farm-castrate', name: 'Castration (Banding)', description: 'Band or surgical castration of bull calves', unit: 'per head', defaultPrice: 22 },
          { id: 'farm-vaccinate', name: 'Vaccination Program', description: 'Administer standard cattle vaccine protocol per head', unit: 'per head', defaultPrice: 15 },
        ]
      },
      {
        name: 'Feed & Nutrition',
        services: [
          { id: 'farm-hay', name: 'Hay Delivery (Round Bale)', description: 'Deliver large round bale hay, per bale', unit: 'per bale', defaultPrice: 85 },
          { id: 'farm-hay-sq', name: 'Hay Delivery (Square Bale)', description: 'Deliver square bale hay, per bale', unit: 'per bale', defaultPrice: 12 },
          { id: 'farm-mineral', name: 'Mineral/Feed Supplement Delivery', description: 'Deliver and place loose mineral or supplement blocks', unit: 'per bag/block', defaultPrice: 35 },
        ]
      },
      {
        name: 'Land & Infrastructure',
        services: [
          { id: 'farm-fence-wire', name: 'Barbed Wire Fence Installation', description: 'Install 5-strand barbed wire fence per rod', unit: 'per rod', defaultPrice: 75 },
          { id: 'farm-fence-electric', name: 'Electric Fence Installation', description: 'Install electric fence system per linear ft', unit: 'per linear ft', defaultPrice: 2.5 },
          { id: 'farm-pond', name: 'Pond Excavation / Cleaning', description: 'Excavate new or clean existing pond', unit: 'per job', defaultPrice: 5500 },
          { id: 'farm-spray', name: 'Pasture Weed/Brush Spraying', description: 'Herbicide application to pasture per acre', unit: 'per acre', defaultPrice: 18 },
          { id: 'farm-hay-bale', name: 'Hay Baling Service', description: 'Bale cut hay per round bale produced', unit: 'per bale', defaultPrice: 22 },
          { id: 'farm-dirt', name: 'Dirt Work / Land Leveling', description: 'Grading, leveling, or dozer work per hour', unit: 'per hour', defaultPrice: 175 },
        ]
      },
    ]
  },

  it: {
    id: 'it',
    name: 'Information Technology',
    icon: '💻',
    color: '#2563eb',
    description: 'IT Services & Technology Solutions',
    notes: 'Remote support available for most issues. On-site visits billed at minimum 1 hour. All work guaranteed for 30 days. Data backup recommended before any major service.',
    paymentTerms: 'Net 15 for business clients. Residential clients: payment due at time of service. Monthly retainer agreements available.',
    sections: [
      {
        name: 'Support & Repair',
        services: [
          { id: 'it-remote', name: 'Remote IT Support', description: 'Remote troubleshooting and support per hour', unit: 'per hour', defaultPrice: 95 },
          { id: 'it-onsite', name: 'On-Site IT Support', description: 'On-site support and repair, minimum 1 hour', unit: 'per hour', defaultPrice: 145 },
          { id: 'it-pc-tune', name: 'PC/Mac Tune-Up & Cleanup', description: 'Clean malware, optimize startup, update drivers', unit: 'per device', defaultPrice: 99 },
          { id: 'it-virus', name: 'Virus/Malware Removal', description: 'Full system scan, remove malware, secure system', unit: 'per device', defaultPrice: 149 },
          { id: 'it-data', name: 'Data Recovery', description: 'Recover data from failed or corrupted drive', unit: 'per job', defaultPrice: 350 },
        ]
      },
      {
        name: 'Network & Infrastructure',
        services: [
          { id: 'it-network', name: 'Network Setup & Configuration', description: 'Set up wired/wireless network for home or office', unit: 'per job', defaultPrice: 350 },
          { id: 'it-wifi', name: 'WiFi Optimization & Extenders', description: 'Analyze and optimize WiFi, install access points', unit: 'per job', defaultPrice: 225 },
          { id: 'it-server', name: 'Server Setup & Configuration', description: 'Set up and configure file/application server', unit: 'per server', defaultPrice: 1200 },
          { id: 'it-cable', name: 'Network Cabling (Per Run)', description: 'Run Cat6 ethernet cable, terminate and test', unit: 'per run', defaultPrice: 125 },
          { id: 'it-firewall', name: 'Firewall / Security Setup', description: 'Configure enterprise-grade firewall and security rules', unit: 'per device', defaultPrice: 450 },
        ]
      },
      {
        name: 'Managed Services',
        services: [
          { id: 'it-msp-basic', name: 'Managed IT (Basic, per device)', description: 'Monthly monitoring, updates, and remote support', unit: 'per device/mo', defaultPrice: 45 },
          { id: 'it-msp-pro', name: 'Managed IT (Pro, per user)', description: 'Unlimited remote support plus onsite visits', unit: 'per user/mo', defaultPrice: 125 },
          { id: 'it-backup', name: 'Cloud Backup (Monthly)', description: 'Managed cloud backup, monitoring, and restore testing', unit: 'per device/mo', defaultPrice: 35 },
          { id: 'it-security', name: 'Cybersecurity Monitoring', description: 'SOC monitoring, threat detection, incident response', unit: 'per user/mo', defaultPrice: 65 },
          { id: 'it-email', name: 'Email & Microsoft 365 Admin', description: 'Manage Microsoft 365 tenant, licenses, and mailboxes', unit: 'per user/mo', defaultPrice: 18 },
        ]
      },
      {
        name: 'Software & Development',
        services: [
          { id: 'it-software', name: 'Software Installation & Setup', description: 'Install and configure business software per PC', unit: 'per device', defaultPrice: 85 },
          { id: 'it-web', name: 'Website Development (Per Page)', description: 'Design and develop website pages', unit: 'per page', defaultPrice: 350 },
          { id: 'it-automation', name: 'Business Process Automation', description: 'Automate workflows using Microsoft/Zapier/API', unit: 'per hour', defaultPrice: 150 },
          { id: 'it-training', name: 'IT Training / Lunch & Learn', description: 'Staff technology training session', unit: 'per session', defaultPrice: 500 },
        ]
      },
    ]
  },
};

export const TEMPLATE_LIST = Object.values(QUOTE_TEMPLATES);
