import { describe, expect, it } from "vitest";
import { storeStatus } from "../src/shared/catalog";

describe("horario del local", () => {
  it("abre de lunes a sábado en los dos turnos", () => {
    expect(storeStatus(new Date("2026-10-26T08:00:00-06:00")).label).toBe("Abierto");
    expect(storeStatus(new Date("2026-10-26T13:29:00-06:00")).label).toBe("Abierto");
    expect(storeStatus(new Date("2026-10-31T16:30:00-06:00")).label).toBe("Abierto");
    expect(storeStatus(new Date("2026-10-31T21:29:00-06:00")).label).toBe("Abierto");
  });

  it("cierra entre turnos, al terminar la noche y los domingos", () => {
    expect(storeStatus(new Date("2026-10-26T07:59:00-06:00")).label).toBe("Cerrado");
    expect(storeStatus(new Date("2026-10-26T13:30:00-06:00")).label).toBe("Cerrado");
    expect(storeStatus(new Date("2026-10-26T16:29:00-06:00")).label).toBe("Cerrado");
    expect(storeStatus(new Date("2026-10-26T21:30:00-06:00")).label).toBe("Cerrado");
    expect(storeStatus(new Date("2026-10-25T12:00:00-06:00")).open).toBe(false);
  });
});
