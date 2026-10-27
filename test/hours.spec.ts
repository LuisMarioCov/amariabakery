import { describe, expect, it } from "vitest";
import { isOrderSlot, orderDates, orderTimes, storeStatus } from "../src/shared/catalog";

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

  it("ofrece horas solo dentro de los turnos y deja fuera el domingo", () => {
    const mondayMorning = new Date("2026-10-26T07:00:00-06:00");
    expect(orderTimes("2026-10-26", mondayMorning)).toEqual([
      "08:00",
      "08:30",
      "09:00",
      "09:30",
      "10:00",
      "10:30",
      "11:00",
      "11:30",
      "12:00",
      "12:30",
      "13:00",
      "16:30",
      "17:00",
      "17:30",
      "18:00",
      "18:30",
      "19:00",
      "19:30",
      "20:00",
      "20:30",
      "21:00",
    ]);
    expect(orderTimes("2026-10-26", new Date("2026-10-26T10:15:00-06:00"))).not.toContain("10:00");
    expect(orderTimes("2026-10-26", new Date("2026-10-26T10:15:00-06:00"))).toContain("10:30");
    expect(orderTimes("2026-10-25", mondayMorning)).toEqual([]);
    expect(isOrderSlot("2026-10-26", "15:00", mondayMorning)).toBe(false);
    expect(isOrderSlot("2026-10-26", "13:30", mondayMorning)).toBe(false);
    expect(orderDates(new Date("2026-10-25T12:00:00-06:00")).some((day) => day.date === "2026-10-25")).toBe(false);
  });
});
