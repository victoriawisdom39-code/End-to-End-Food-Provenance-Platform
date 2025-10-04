(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-INVALID-STANDARD u101)
(define-constant ERR-INVALID-BATCH-ID u102)
(define-constant ERR-INVALID-SENSOR-HASH u103)
(define-constant ERR-INVALID-THRESHOLD u104)
(define-constant ERR-INVALID-TIMESTAMP u105)
(define-constant ERR-BATCH-ALREADY-CERTIFIED u106)
(define-constant ERR-BATCH-NOT-FOUND u107)
(define-constant ERR-INVALID-PESTICIDE-LEVEL u108)
(define-constant ERR-INVALID-SOIL-MOISTURE u109)
(define-constant ERR-INVALID-TEMPERATURE u110)
(define-constant ERR-INVALID-PH-LEVEL u111)
(define-constant ERR-INVALID-NUTRIENT-LEVEL u112)
(define-constant ERR-INVALID-COMPLIANCE-PERIOD u113)
(define-constant ERR-STANDARD-ALREADY-EXISTS u114)
(define-constant ERR-STANDARD-NOT-FOUND u115)
(define-constant ERR-INVALID-UPDATE-PARAM u116)
(define-constant ERR-MAX-STANDARDS-EXCEEDED u117)
(define-constant ERR-INVALID-CROP-TYPE u118)
(define-constant ERR-INVALID-LOCATION u119)
(define-constant ERR-INVALID-ORACLE u120)
(define-constant ERR-INVALID-CERTIFICATION-FEE u121)
(define-constant ERR-ORACLE-NOT-VERIFIED u122)
(define-constant ERR-INVALID-HUMIDITY u123)
(define-constant ERR-INVALID-LIGHT-EXPOSURE u124)
(define-constant ERR-INVALID-WATER_USAGE u125)

(define-data-var next-standard-id uint u0)
(define-data-var max-standards uint u50)
(define-data-var certification-fee uint u500)
(define-data-var admin-principal principal tx-sender)
(define-data-var oracle-principal (optional principal) none)

(define-map organic-standards
  uint
  {
    crop-type: (string-utf8 50),
    max-pesticide-level: uint,
    min-soil-moisture: uint,
    max-temperature: uint,
    min-ph-level: uint,
    max-nutrient-level: uint,
    compliance-period: uint,
    location: (string-utf8 100),
    max-humidity: uint,
    min-light-exposure: uint,
    max-water-usage: uint
  }
)

(define-map standards-by-crop
  (string-utf8 50)
  uint)

(define-map batch-certifications
  uint
  {
    batch-id: uint,
    certified: bool,
    timestamp: uint,
    sensor-data-hash: (buff 32),
    standard-id: uint,
    certifier: principal
  }
)

(define-map sensor-data
  (buff 32)
  {
    pesticide-level: uint,
    soil-moisture: uint,
    temperature: uint,
    ph-level: uint,
    nutrient-level: uint,
    humidity: uint,
    light-exposure: uint,
    water-usage: uint,
    timestamp: uint
  }
)

(define-map batch-sensor-history
  { batch-id: uint, index: uint }
  (buff 32))

(define-read-only (get-standard (id uint))
  (map-get? organic-standards id))

(define-read-only (get-certification (batch-id uint))
  (map-get? batch-certifications batch-id))

(define-read-only (get-sensor-data (hash (buff 32)))
  (map-get? sensor-data hash))

(define-read-only (is-standard-registered (crop (string-utf8 50)))
  (is-some (map-get? standards-by-crop crop)))

(define-private (validate-crop-type (crop (string-utf8 50)))
  (if (and (> (len crop) u0) (<= (len crop) u50))
      (ok true)
      (err ERR-INVALID-CROP-TYPE)))

(define-private (validate-level (level uint) (min uint) (max uint))
  (if (and (>= level min) (<= level max))
      (ok true)
      (err ERR-INVALID-THRESHOLD)))

(define-private (validate-timestamp (ts uint))
  (if (>= ts block-height)
      (ok true)
      (err ERR-INVALID-TIMESTAMP)))

(define-private (validate-location (loc (string-utf8 100)))
  (if (and (> (len loc) u0) (<= (len loc) u100))
      (ok true)
      (err ERR-INVALID-LOCATION)))

(define-private (validate-principal (p principal))
  (if (not (is-eq p tx-sender))
      (ok true)
      (err ERR-NOT-AUTHORIZED)))

(define-public (set-oracle-principal (oracle principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin-principal)) (err ERR-NOT-AUTHORIZED))
    (try! (validate-principal oracle))
    (var-set oracle-principal (some oracle))
    (ok true)))

(define-public (set-certification-fee (new-fee uint))
  (begin
    (asserts! (is-eq tx-sender (var-get admin-principal)) (err ERR-NOT-AUTHORIZED))
    (asserts! (>= new-fee u0) (err ERR-INVALID-CERTIFICATION-FEE))
    (var-set certification-fee new-fee)
    (ok true)))

(define-public (set-max-standards (new-max uint))
  (begin
    (asserts! (is-eq tx-sender (var-get admin-principal)) (err ERR-NOT-AUTHORIZED))
    (asserts! (> new-max u0) (err ERR-INVALID_UPDATE-PARAM))
    (var-set max-standards new-max)
    (ok true)))

(define-public (add-standard
  (crop-type (string-utf8 50))
  (max-pesticide-level uint)
  (min-soil-moisture uint)
  (max-temperature uint)
  (min-ph-level uint)
  (max-nutrient-level uint)
  (compliance-period uint)
  (location (string-utf8 100))
  (max-humidity uint)
  (min-light-exposure uint)
  (max-water-usage uint))
  (let ((next-id (var-get next-standard-id))
        (current-max (var-get max-standards)))
    (asserts! (is-eq tx-sender (var-get admin-principal)) (err ERR-NOT-AUTHORIZED))
    (asserts! (< next-id current-max) (err ERR-MAX-STANDARDS-EXCEEDED))
    (try! (validate-crop-type crop-type))
    (try! (validate-level max-pesticide-level u0 u100))
    (try! (validate-level min-soil-moisture u10 u100))
    (try! (validate-level max-temperature u0 u50))
    (try! (validate-level min-ph-level u4 u9))
    (try! (validate-level max-nutrient-level u0 u200))
    (try! (validate-level compliance-period u1 u365))
    (try! (validate-location location))
    (try! (validate-level max-humidity u0 u100))
    (try! (validate-level min-light-exposure u0 u24))
    (try! (validate-level max-water-usage u0 u1000))
    (asserts! (is-none (map-get? standards-by-crop crop-type)) (err ERR-STANDARD-ALREADY-EXISTS))
    (map-set organic-standards next-id
      { crop-type: crop-type,
        max-pesticide-level: max-pesticide-level,
        min-soil-moisture: min-soil-moisture,
        max-temperature: max-temperature,
        min-ph-level: min-ph-level,
        max-nutrient-level: max-nutrient-level,
        compliance-period: compliance-period,
        location: location,
        max-humidity: max-humidity,
        min-light-exposure: min-light-exposure,
        max-water-usage: max-water-usage })
    (map-set standards-by-crop crop-type next-id)
    (var-set next-standard-id (+ next-id u1))
    (print { event: "standard-added", id: next-id })
    (ok next-id)))

(define-public (submit-sensor-data
  (hash (buff 32))
  (pesticide-level uint)
  (soil-moisture uint)
  (temperature uint)
  (ph-level uint)
  (nutrient-level uint)
  (humidity uint)
  (light-exposure uint)
  (water-usage uint))
  (begin
    (asserts! (is-some (var-get oracle-principal)) (err ERR-ORACLE-NOT-VERIFIED))
    (asserts! (is-eq tx-sender (unwrap! (var-get oracle-principal) (err ERR-NOT-AUTHORIZED))) (err ERR-NOT-AUTHORIZED))
    (try! (validate-level pesticide-level u0 u100))
    (try! (validate-level soil-moisture u10 u100))
    (try! (validate-level temperature u0 u50))
    (try! (validate-level ph-level u4 u9))
    (try! (validate-level nutrient-level u0 u200))
    (try! (validate-level humidity u0 u100))
    (try! (validate-level light-exposure u0 u24))
    (try! (validate-level water-usage u0 u1000))
    (map-set sensor-data hash
      { pesticide-level: pesticide-level,
        soil-moisture: soil-moisture,
        temperature: temperature,
        ph-level: ph-level,
        nutrient-level: nutrient-level,
        humidity: humidity,
        light-exposure: light-exposure,
        water-usage: water-usage,
        timestamp: block-height })
    (print { event: "sensor-data-submitted", hash: hash })
    (ok true)))

(define-public (certify-batch
  (batch-id uint)
  (sensor-hash (buff 32))
  (standard-id uint))
  (let ((standard (map-get? organic-standards standard-id))
        (data (map-get? sensor-data sensor-hash)))
    (match standard std
      (match data d
        (begin
          (asserts! (is-none (map-get? batch-certifications batch-id)) (err ERR-BATCH-ALREADY-CERTIFIED))
          (try! (stx-transfer? (var-get certification-fee) tx-sender (var-get admin-principal)))
          (asserts! (<= (get pesticide-level d) (get max-pesticide-level std)) (err ERR-INVALID_PESTICIDE-LEVEL))
          (asserts! (>= (get soil-moisture d) (get min-soil-moisture std)) (err ERR-INVALID_SOIL_MOISTURE))
          (asserts! (<= (get temperature d) (get max-temperature std)) (err ERR-INVALID_TEMPERATURE))
          (asserts! (>= (get ph-level d) (get min-ph-level std)) (err ERR-INVALID_PH-LEVEL))
          (asserts! (<= (get nutrient-level d) (get max-nutrient-level std)) (err ERR-INVALID_NUTRIENT-LEVEL))
          (asserts! (<= (get humidity d) (get max-humidity std)) (err ERR-INVALID_HUMIDITY))
          (asserts! (>= (get light-exposure d) (get min-light-exposure std)) (err ERR-INVALID_LIGHT_EXPOSURE))
          (asserts! (<= (get water-usage d) (get max-water-usage std)) (err ERR-INVALID_WATER_USAGE))
          (map-set batch-certifications batch-id
            { batch-id: batch-id,
              certified: true,
              timestamp: block-height,
              sensor-data-hash: sensor-hash,
              standard-id: standard-id,
              certifier: tx-sender })
          (print { event: "batch-certified", batch-id: batch-id })
          (ok true))
        (err ERR-INVALID_SENSOR_HASH))
      (err ERR_STANDARD_NOT_FOUND))))

(define-public (add-sensor-to-batch-history (batch-id uint) (index uint) (hash (buff 32)))
  (begin
    (asserts! (is-eq tx-sender (var-get admin-principal)) (err ERR-NOT-AUTHORIZED))
    (asserts! (is-some (map-get? sensor-data hash)) (err ERR_INVALID_SENSOR_HASH))
    (map-set batch-sensor-history { batch-id: batch-id, index: index } hash)
    (ok true)))

(define-read-only (get-batch-sensor-history (batch-id uint) (index uint))
  (map-get? batch-sensor-history { batch-id: batch-id, index: index }))

(define-public (revoke-certification (batch-id uint))
  (let ((cert (map-get? batch-certifications batch-id)))
    (match cert c
      (begin
        (asserts! (is-eq tx-sender (var-get admin-principal)) (err ERR-NOT-AUTHORIZED))
        (map-delete batch-certifications batch-id)
        (print { event: "certification-revoked", batch-id: batch-id })
        (ok true))
      (err ERR_BATCH_NOT_FOUND))))

(define-public (update-standard
  (standard-id uint)
  (new-max-pesticide-level uint)
  (new-min-soil-moisture uint)
  (new-max-temperature uint))
  (let ((std (map-get? organic-standards standard-id)))
    (match std s
      (begin
        (asserts! (is-eq tx-sender (var-get admin-principal)) (err ERR-NOT-AUTHORIZED))
        (try! (validate-level new-max-pesticide-level u0 u100))
        (try! (validate-level new-min-soil-moisture u10 u100))
        (try! (validate-level new-max-temperature u0 u50))
        (map-set organic-standards standard-id
          { crop-type: (get crop-type s),
            max-pesticide-level: new-max-pesticide-level,
            min-soil-moisture: new-min-soil-moisture,
            max-temperature: new-max-temperature,
            min-ph-level: (get min-ph-level s),
            max-nutrient-level: (get max-nutrient-level s),
            compliance-period: (get compliance-period s),
            location: (get location s),
            max-humidity: (get max-humidity s),
            min-light-exposure: (get min-light-exposure s),
            max-water-usage: (get max-water-usage s) })
        (print { event: "standard-updated", id: standard-id })
        (ok true))
      (err ERR_STANDARD_NOT_FOUND))))

(define-read-only (get-standard-count)
  (ok (var-get next-standard-id)))