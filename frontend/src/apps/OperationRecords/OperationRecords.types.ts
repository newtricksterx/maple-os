type record_status = "PRE-ALERT" | "HOLD" | "WAIT FOR AN" | "SENT PU PLAN" | "ARRIVED";

type airports = "YYZ"

type airlines = "GTA" | "MENZIES"

type record_type = "IID"

type trucking_company = "FasterMoving" | "SpeedFlex"

export type record = {
    id: number;
    record_type: record_type;
    awb: string;
    airport_dest: airports;
    status: record_status;
    eta_airport: string;
    cargo_dest: airlines;
    pcs: number | null;
    weight: number | null;
    cbm: number | null;
    skid: number | null;
    pu_date: string;
    inbound_date: string;
    an_received_date: string;
    lastFreeDay: string;
    trucking_company: trucking_company;
    payment: boolean;
    notes: string;
    completed: boolean;
}

