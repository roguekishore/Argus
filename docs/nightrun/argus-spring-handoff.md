# ARGUS Spring Migration Handoff Report

**Run**: `argus-spring`  
**Branch**: `chore/stack-spring`  
**Date**: 2026-11-01  
**Target Stack**: Spring Boot 4.1.2 on Java 25 (Eclipse Temurin 25 / GraalVM 25)

---

## 1. Phases Passed

From `../PROGRESS.md`:

| Phase | Description | Status | Commit | Notes |
|---|---|---|---|---|
| P1 | Boot 4.1.2 compiles and tests pass on Java 17 | `done` | `41b9556634` | Boot parent 4.1.2, webmvc modular starter, validation starter, Jackson 3 porting |
| P2 | Boot 4.1.2 runtime parity on Java 17 | `done` | — | G2 boot, G3 30/30 requests match, G8 schema parity, G4 AOT |
| P3 | Java 25 (stage C2) | `done` | `658f124a20` | `java.version` 25, Temurin 25 Dockerfile images, GraalVM 25 builder |
| P4 | Review and fix | `done` | `31dca92683` | Spec compliance review, finding verification, code clean |
| P5 | Handoff report | `running` -> `done` | — | Owner handoff documentation |

---

## 2. Gate Results

From `../gate-reports/*.txt`:

### Quoted G3 and G8 Lines

From `../gate-reports/run25.runtime.txt` (Stage C2 — Java 25):
```
G2 PASS: migrated jar booted (ERROR lines: baseline 1, migrated 1)
G3 PASS: 30 requests match
G8 PASS: schema identical (183 rows)
```

From `../gate-reports/run17.runtime.txt` (Stage C1 — Java 17):
```
G2 PASS: migrated jar booted (ERROR lines: baseline 1, migrated 1)
G3 PASS: 30 requests match
G8 PASS: schema identical (183 rows)
```

From `../gate-reports/baseline.runtime.txt` (Baseline verification):
```
G2 PASS: migrated jar booted (ERROR lines: baseline 1, migrated 1)
self-check: kept 30 requests, dropped 0 unstable: []
G3 PASS: 30 requests match
G8 PASS: schema identical (183 rows)
```

### Additional Gate Confirmations
- **G1 (Maven verify)**: PASS on both Java 17 (`build17.mvn.log`, `run17.mvn.log`) and Java 25 (`run25.mvn.log`, `check25.mvn.log`).
- **G4 (AOT processing)**: PASS on both Java 17 (`run17.aot.log`) and Java 25 (`run25.aot.log`) via `mvn -B -q -Pnative -DskipTests -DskipNativeBuild=true package`.
- **G7 (Scope check)**: PASS (`GATE PASS [scope]`). Only paths matching `^(springapp/|docs/nightrun/)` have been modified.
- **V (Version assertions)**: PASS (`spring-boot-starter-parent` 4.1.2, `java.version` 25, Dockerfile builder `maven:3.9-eclipse-temurin-25`, runtime `eclipse-temurin:25-jre`, native builder `ghcr.io/graalvm/native-image-community:25`).

---

## 3. Files Changed and Why

Output of `git diff --stat $(cat ../baseline/sha)`:
```
 docs/nightrun/argus-spring-review.md               | 115 +++++++++++++++++++++
 springapp/Dockerfile                               |   4 +-
 springapp/Dockerfile.native                        |   2 +-
 springapp/pom.xml                                  |  17 +--
 .../springapp/controller/ChatController.java       |   6 +-
 .../com/backend/springapp/service/AIService.java   |   6 +-
 .../service/DuplicateDetectionService.java         |   6 +-
 .../springapp/service/ImageAnalysisService.java    |  10 +-
 .../whatsapp/service/WhatsAppAgentService.java     |   6 +-
 .../src/main/resources/application.properties      |   1 -
 10 files changed, 140 insertions(+), 33 deletions(-)
```
*(Plus untracked `docs/nightrun/argus-spring-handoff.md` added in phase P5)*

### Detailed Rationale by File

1. **`docs/nightrun/argus-spring-handoff.md`**
   - Handoff report for repository owner detailing completed phases, gate outputs, change log, dependencies, and deployment instructions.
2. **`docs/nightrun/argus-spring-review.md`**
   - Comprehensive Phase P4 code review document covering spec compliance, non-gate observable behaviors, and review findings.
3. **`springapp/Dockerfile`**
   - Updated build stage to `maven:3.9-eclipse-temurin-25` and runtime stage to `eclipse-temurin:25-jre` per SPEC.md Section 1 & 4 (Java 25 Stage C2).
4. **`springapp/Dockerfile.native`**
   - Updated builder image to `ghcr.io/graalvm/native-image-community:25` per SPEC.md Section 1 & 3 (GraalVM 25 requirement for Boot 4).
5. **`springapp/pom.xml`**
   - Upgraded `spring-boot-starter-parent` from `3.5.16` to `4.1.2`.
   - Updated `<java.version>` from `17` to `25`.
   - Replaced `spring-boot-starter-web` with `spring-boot-starter-webmvc` per Boot 4 modular architecture.
   - Replaced unmanaged `jakarta.validation:jakarta.validation-api` (3.0.2) and `org.hibernate.validator:hibernate-validator` (7.0.5.Final) with Boot-managed `spring-boot-starter-validation`.
6. **`springapp/src/main/java/com/backend/springapp/controller/ChatController.java`**
   - Replaced Jackson 2 imports `com.fasterxml.jackson.databind.{JsonNode, ObjectMapper}` with Jackson 3 `tools.jackson.databind.JsonNode` and `tools.jackson.databind.json.JsonMapper` per Boot 4 Jackson 3 migration requirement.
7. **`springapp/src/main/java/com/backend/springapp/service/AIService.java`**
   - Migrated to Jackson 3 `tools.jackson.databind.*` and instantiated mapper via `JsonMapper.builder().build()`.
8. **`springapp/src/main/java/com/backend/springapp/service/DuplicateDetectionService.java`**
   - Migrated to Jackson 3 `tools.jackson.databind.*` and instantiated mapper via `JsonMapper.builder().build()`.
9. **`springapp/src/main/java/com/backend/springapp/service/ImageAnalysisService.java`**
   - Migrated to Jackson 3 `tools.jackson.databind.*` and updated inline `toJson()` / `fromJson()` helpers to instantiate `JsonMapper.builder().build()`.
10. **`springapp/src/main/java/com/backend/springapp/whatsapp/service/WhatsAppAgentService.java`**
    - Migrated to Jackson 3 `tools.jackson.databind.JsonNode` and `tools.jackson.databind.json.JsonMapper`.
11. **`springapp/src/main/resources/application.properties`**
    - Removed deprecated `spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.MySQL8Dialect` per SPEC.md Section 3 (Hibernate 7 detects MySQL automatically).

---

## 4. Dependencies Added or Removed

### Added
- `org.springframework.boot:spring-boot-starter-webmvc` (Spring Boot 4.1.2 managed) — replaces `spring-boot-starter-web`.
- `org.springframework.boot:spring-boot-starter-validation` (Spring Boot 4.1.2 managed) — replaces manual validation artifacts.

### Removed
- `org.springframework.boot:spring-boot-starter-web` (replaced by modular starter).
- `jakarta.validation:jakarta.validation-api:3.0.2` (replaced by Boot starter).
- `org.hibernate.validator:hibernate-validator:7.0.5.Final` (replaced by Boot starter).

*(Note: `org.springframework.boot:spring-boot-properties-migrator` was temporarily added in P1 to audit properties; zero deprecated properties were detected, and the dependency was removed prior to closing stage C1 as required by SPEC.md Section 3).*

---

## 5. Items in `docs/nightrun/argus-spring-left.md`

`docs/nightrun/argus-spring-left.md` does not exist.

All migration phases, tests, runtime gates (G1, G2, G3, G4, G7, G8, V) completed with 100% pass rates on both Java 17 and Java 25. Nothing was left incomplete, skipped, or disabled.

---

## 6. What the Owner Must Still Do

Per SPEC.md Section 8 and project deployment procedures:
1. **Push the branch**: Push `chore/stack-spring` to the remote repository.
2. **Run GitHub Actions native build**:
   - Go to Actions -> Build and Push -> Run workflow.
   - Select branch `chore/stack-spring` and provide tag `graal`.
3. **Flip `mise.toml`**: Update local / tool environment `mise.toml` (or `.tool-versions`) to `temurin-25` (untracked in repo per spec).
4. **Merge**: Merge `chore/stack-spring` into the target integration/main branch.
5. **Deploy**:
   - Pull and restart the container on the target host:
     ```bash
     sudo docker-compose pull argus && sudo docker-compose up -d argus
     ```
