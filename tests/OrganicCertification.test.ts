import { describe, it, expect, beforeEach } from "vitest";
import { stringUtf8CV, uintCV, buffCV } from "@stacks/transactions";

const ERR_NOT_AUTHORIZED = 100;
const ERR_INVALID_STANDARD = 101;
const ERR_INVALID_BATCH_ID = 102;
const ERR_INVALID_SENSOR_HASH = 103;
const ERR_INVALID_THRESHOLD = 104;
const ERR_BATCH_ALREADY_CERTIFIED = 106;
const ERR_BATCH_NOT_FOUND = 107;
const ERR_INVALID_PESTICIDE_LEVEL = 108;
const ERR_INVALID_SOIL_MOISTURE = 109;
const ERR_INVALID_TEMPERATURE = 110;
const ERR_INVALID_PH_LEVEL = 111;
const ERR_INVALID_NUTRIENT_LEVEL = 112;
const ERR_STANDARD_ALREADY_EXISTS = 114;
const ERR_STANDARD_NOT_FOUND = 115;
const ERR_INVALID_UPDATE_PARAM = 116;
const ERR_MAX_STANDARDS_EXCEEDED = 117;
const ERR_INVALID_CROP_TYPE = 118;
const ERR_INVALID_LOCATION = 119;
const ERR_INVALID_CERTIFICATION_FEE = 121;
const ERR_ORACLE_NOT_VERIFIED = 122;
const ERR_INVALID_HUMIDITY = 123;
const ERR_INVALID_LIGHT_EXPOSURE = 124;
const ERR_INVALID_WATER_USAGE = 125;

interface Standard {
  cropType: string;
  maxPesticideLevel: number;
  minSoilMoisture: number;
  maxTemperature: number;
  minPhLevel: number;
  maxNutrientLevel: number;
  compliancePeriod: number;
  location: string;
  maxHumidity: number;
  minLightExposure: number;
  maxWaterUsage: number;
}

interface Certification {
  batchId: number;
  certified: boolean;
  timestamp: number;
  sensorDataHash: Buffer;
  standardId: number;
  certifier: string;
}

interface SensorData {
  pesticideLevel: number;
  soilMoisture: number;
  temperature: number;
  phLevel: number;
  nutrientLevel: number;
  humidity: number;
  lightExposure: number;
  waterUsage: number;
  timestamp: number;
}

interface Result<T> {
  ok: boolean;
  value: T;
}

class OrganicCertificationMock {
  state: {
    nextStandardId: number;
    maxStandards: number;
    certificationFee: number;
    adminPrincipal: string;
    oraclePrincipal: string | null;
    standards: Map<number, Standard>;
    standardsByCrop: Map<string, number>;
    certifications: Map<number, Certification>;
    sensorData: Map<string, SensorData>;
    batchSensorHistory: Map<string, Buffer>;
  } = {
    nextStandardId: 0,
    maxStandards: 50,
    certificationFee: 500,
    adminPrincipal: "ST1ADMIN",
    oraclePrincipal: null,
    standards: new Map(),
    standardsByCrop: new Map(),
    certifications: new Map(),
    sensorData: new Map(),
    batchSensorHistory: new Map(),
  };
  blockHeight: number = 0;
  caller: string = "ST1ADMIN";
  stxTransfers: Array<{ amount: number; from: string; to: string }> = [];

  constructor() {
    this.reset();
  }

  reset() {
    this.state = {
      nextStandardId: 0,
      maxStandards: 50,
      certificationFee: 500,
      adminPrincipal: "ST1ADMIN",
      oraclePrincipal: null,
      standards: new Map(),
      standardsByCrop: new Map(),
      certifications: new Map(),
      sensorData: new Map(),
      batchSensorHistory: new Map(),
    };
    this.blockHeight = 0;
    this.caller = "ST1ADMIN";
    this.stxTransfers = [];
  }

  setOraclePrincipal(oracle: string): Result<boolean> {
    if (this.caller !== this.state.adminPrincipal) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (oracle === this.caller) return { ok: false, value: ERR_NOT_AUTHORIZED };
    this.state.oraclePrincipal = oracle;
    return { ok: true, value: true };
  }

  setCertificationFee(newFee: number): Result<boolean> {
    if (this.caller !== this.state.adminPrincipal) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (newFee < 0) return { ok: false, value: ERR_INVALID_CERTIFICATION_FEE };
    this.state.certificationFee = newFee;
    return { ok: true, value: true };
  }

  setMaxStandards(newMax: number): Result<boolean> {
    if (this.caller !== this.state.adminPrincipal) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (newMax <= 0) return { ok: false, value: ERR_INVALID_UPDATE_PARAM };
    this.state.maxStandards = newMax;
    return { ok: true, value: true };
  }

  addStandard(
    cropType: string,
    maxPesticideLevel: number,
    minSoilMoisture: number,
    maxTemperature: number,
    minPhLevel: number,
    maxNutrientLevel: number,
    compliancePeriod: number,
    location: string,
    maxHumidity: number,
    minLightExposure: number,
    maxWaterUsage: number
  ): Result<number> {
    if (this.caller !== this.state.adminPrincipal) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (this.state.nextStandardId >= this.state.maxStandards) return { ok: false, value: ERR_MAX_STANDARDS_EXCEEDED };
    if (!cropType || cropType.length > 50) return { ok: false, value: ERR_INVALID_CROP_TYPE };
    if (maxPesticideLevel < 0 || maxPesticideLevel > 100) return { ok: false, value: ERR_INVALID_THRESHOLD };
    if (minSoilMoisture < 10 || minSoilMoisture > 100) return { ok: false, value: ERR_INVALID_THRESHOLD };
    if (maxTemperature < 0 || maxTemperature > 50) return { ok: false, value: ERR_INVALID_THRESHOLD };
    if (minPhLevel < 4 || minPhLevel > 9) return { ok: false, value: ERR_INVALID_THRESHOLD };
    if (maxNutrientLevel < 0 || maxNutrientLevel > 200) return { ok: false, value: ERR_INVALID_THRESHOLD };
    if (compliancePeriod < 1 || compliancePeriod > 365) return { ok: false, value: ERR_INVALID_THRESHOLD };
    if (!location || location.length > 100) return { ok: false, value: ERR_INVALID_LOCATION };
    if (maxHumidity < 0 || maxHumidity > 100) return { ok: false, value: ERR_INVALID_THRESHOLD };
    if (minLightExposure < 0 || minLightExposure > 24) return { ok: false, value: ERR_INVALID_THRESHOLD };
    if (maxWaterUsage < 0 || maxWaterUsage > 1000) return { ok: false, value: ERR_INVALID_THRESHOLD };
    if (this.state.standardsByCrop.has(cropType)) return { ok: false, value: ERR_STANDARD_ALREADY_EXISTS };
    const id = this.state.nextStandardId;
    const standard: Standard = {
      cropType,
      maxPesticideLevel,
      minSoilMoisture,
      maxTemperature,
      minPhLevel,
      maxNutrientLevel,
      compliancePeriod,
      location,
      maxHumidity,
      minLightExposure,
      maxWaterUsage,
    };
    this.state.standards.set(id, standard);
    this.state.standardsByCrop.set(cropType, id);
    this.state.nextStandardId++;
    return { ok: true, value: id };
  }

  submitSensorData(
    hash: Buffer,
    pesticideLevel: number,
    soilMoisture: number,
    temperature: number,
    phLevel: number,
    nutrientLevel: number,
    humidity: number,
    lightExposure: number,
    waterUsage: number
  ): Result<boolean> {
    if (!this.state.oraclePrincipal) return { ok: false, value: ERR_ORACLE_NOT_VERIFIED };
    if (this.caller !== this.state.oraclePrincipal) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (pesticideLevel < 0 || pesticideLevel > 100) return { ok: false, value: ERR_INVALID_THRESHOLD };
    if (soilMoisture < 10 || soilMoisture > 100) return { ok: false, value: ERR_INVALID_THRESHOLD };
    if (temperature < 0 || temperature > 50) return { ok: false, value: ERR_INVALID_THRESHOLD };
    if (phLevel < 4 || phLevel > 9) return { ok: false, value: ERR_INVALID_THRESHOLD };
    if (nutrientLevel < 0 || nutrientLevel > 200) return { ok: false, value: ERR_INVALID_THRESHOLD };
    if (humidity < 0 || humidity > 100) return { ok: false, value: ERR_INVALID_THRESHOLD };
    if (lightExposure < 0 || lightExposure > 24) return { ok: false, value: ERR_INVALID_THRESHOLD };
    if (waterUsage < 0 || waterUsage > 1000) return { ok: false, value: ERR_INVALID_THRESHOLD };
    const key = hash.toString('hex');
    const data: SensorData = {
      pesticideLevel,
      soilMoisture,
      temperature,
      phLevel,
      nutrientLevel,
      humidity,
      lightExposure,
      waterUsage,
      timestamp: this.blockHeight,
    };
    this.state.sensorData.set(key, data);
    return { ok: true, value: true };
  }

  certifyBatch(batchId: number, sensorHash: Buffer, standardId: number): Result<boolean> {
    const standard = this.state.standards.get(standardId);
    if (!standard) return { ok: false, value: ERR_STANDARD_NOT_FOUND };
    const key = sensorHash.toString('hex');
    const data = this.state.sensorData.get(key);
    if (!data) return { ok: false, value: ERR_INVALID_SENSOR_HASH };
    if (this.state.certifications.has(batchId)) return { ok: false, value: ERR_BATCH_ALREADY_CERTIFIED };
    if (data.pesticideLevel > standard.maxPesticideLevel) return { ok: false, value: ERR_INVALID_PESTICIDE_LEVEL };
    if (data.soilMoisture < standard.minSoilMoisture) return { ok: false, value: ERR_INVALID_SOIL_MOISTURE };
    if (data.temperature > standard.maxTemperature) return { ok: false, value: ERR_INVALID_TEMPERATURE };
    if (data.phLevel < standard.minPhLevel) return { ok: false, value: ERR_INVALID_PH_LEVEL };
    if (data.nutrientLevel > standard.maxNutrientLevel) return { ok: false, value: ERR_INVALID_NUTRIENT_LEVEL };
    if (data.humidity > standard.maxHumidity) return { ok: false, value: ERR_INVALID_HUMIDITY };
    if (data.lightExposure < standard.minLightExposure) return { ok: false, value: ERR_INVALID_LIGHT_EXPOSURE };
    if (data.waterUsage > standard.maxWaterUsage) return { ok: false, value: ERR_INVALID_WATER_USAGE };
    this.stxTransfers.push({ amount: this.state.certificationFee, from: this.caller, to: this.state.adminPrincipal });
    const certification: Certification = {
      batchId,
      certified: true,
      timestamp: this.blockHeight,
      sensorDataHash,
      standardId,
      certifier: this.caller,
    };
    this.state.certifications.set(batchId, certification);
    return { ok: true, value: true };
  }

  addSensorToBatchHistory(batchId: number, index: number, hash: Buffer): Result<boolean> {
    if (this.caller !== this.state.adminPrincipal) return { ok: false, value: ERR_NOT_AUTHORIZED };
    const key = `${batchId}-${index}`;
    if (!this.state.sensorData.has(hash.toString('hex'))) return { ok: false, value: ERR_INVALID_SENSOR_HASH };
    this.state.batchSensorHistory.set(key, hash);
    return { ok: true, value: true };
  }

  getBatchSensorHistory(batchId: number, index: number): Buffer | null {
    const key = `${batchId}-${index}`;
    return this.state.batchSensorHistory.get(key) || null;
  }

  revokeCertification(batchId: number): Result<boolean> {
    if (this.caller !== this.state.adminPrincipal) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (!this.state.certifications.has(batchId)) return { ok: false, value: ERR_BATCH_NOT_FOUND };
    this.state.certifications.delete(batchId);
    return { ok: true, value: true };
  }

  updateStandard(standardId: number, newMaxPesticideLevel: number, newMinSoilMoisture: number, newMaxTemperature: number): Result<boolean> {
    if (this.caller !== this.state.adminPrincipal) return { ok: false, value: ERR_NOT_AUTHORIZED };
    const standard = this.state.standards.get(standardId);
    if (!standard) return { ok: false, value: ERR_STANDARD_NOT_FOUND };
    if (newMaxPesticideLevel < 0 || newMaxPesticideLevel > 100) return { ok: false, value: ERR_INVALID_THRESHOLD };
    if (newMinSoilMoisture < 10 || newMinSoilMoisture > 100) return { ok: false, value: ERR_INVALID_THRESHOLD };
    if (newMaxTemperature < 0 || newMaxTemperature > 50) return { ok: false, value: ERR_INVALID_THRESHOLD };
    const updated: Standard = {
      ...standard,
      maxPesticideLevel: newMaxPesticideLevel,
      minSoilMoisture: newMinSoilMoisture,
      maxTemperature: newMaxTemperature,
    };
    this.state.standards.set(standardId, updated);
    return { ok: true, value: true };
  }

  getStandardCount(): Result<number> {
    return { ok: true, value: this.state.nextStandardId };
  }
}

describe("OrganicCertificationContract", () => {
  let contract: OrganicCertificationMock;

  beforeEach(() => {
    contract = new OrganicCertificationMock();
    contract.reset();
  });

  it("adds a standard successfully", () => {
    const result = contract.addStandard("Wheat", 10, 20, 30, 5, 100, 90, "FarmA", 80, 12, 500);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(0);
  });

  it("rejects duplicate standard", () => {
    contract.addStandard("Wheat", 10, 20, 30, 5, 100, 90, "FarmA", 80, 12, 500);
    const result = contract.addStandard("Wheat", 15, 25, 35, 6, 150, 120, "FarmB", 85, 14, 600);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_STANDARD_ALREADY_EXISTS);
  });

  it("submits sensor data successfully", () => {
    contract.setOraclePrincipal("ST2ORACLE");
    contract.caller = "ST2ORACLE";
    const hash = Buffer.from("testhash");
    const result = contract.submitSensorData(hash, 5, 25, 25, 6, 80, 70, 10, 400);
    expect(result.ok).toBe(true);
  });

  it("rejects certification with invalid data", () => {
    contract.addStandard("Wheat", 10, 20, 30, 5, 100, 90, "FarmA", 80, 12, 500);
    contract.setOraclePrincipal("ST2ORACLE");
    contract.caller = "ST2ORACLE";
    const hash = Buffer.from("testhash");
    contract.submitSensorData(hash, 15, 25, 25, 6, 80, 70, 10, 400);
    contract.caller = "ST1ADMIN";
    const result = contract.certifyBatch(1, hash, 0);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_PESTICIDE_LEVEL);
  });

  it("updates standard successfully", () => {
    contract.addStandard("Wheat", 10, 20, 30, 5, 100, 90, "FarmA", 80, 12, 500);
    const result = contract.updateStandard(0, 15, 25, 35);
    expect(result.ok).toBe(true);
  });

  it("adds sensor to batch history successfully", () => {
    contract.setOraclePrincipal("ST2ORACLE");
    contract.caller = "ST2ORACLE";
    const hash = Buffer.from("testhash");
    contract.submitSensorData(hash, 5, 25, 25, 6, 80, 70, 10, 400);
    contract.caller = "ST1ADMIN";
    const result = contract.addSensorToBatchHistory(1, 0, hash);
    expect(result.ok).toBe(true);
  });

  it("sets certification fee successfully", () => {
    const result = contract.setCertificationFee(1000);
    expect(result.ok).toBe(true);
    expect(contract.state.certificationFee).toBe(1000);
  });

  it("gets standard count correctly", () => {
    contract.addStandard("Wheat", 10, 20, 30, 5, 100, 90, "FarmA", 80, 12, 500);
    contract.addStandard("Corn", 15, 25, 35, 6, 150, 120, "FarmB", 85, 14, 600);
    const result = contract.getStandardCount();
    expect(result.ok).toBe(true);
    expect(result.value).toBe(2);
  });

  it("rejects add standard by non-admin", () => {
    contract.caller = "ST3FAKE";
    const result = contract.addStandard("Wheat", 10, 20, 30, 5, 100, 90, "FarmA", 80, 12, 500);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NOT_AUTHORIZED);
  });

  it("rejects submit sensor data without oracle", () => {
    const hash = Buffer.from("testhash");
    const result = contract.submitSensorData(hash, 5, 25, 25, 6, 80, 70, 10, 400);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_ORACLE_NOT_VERIFIED);
  });
});