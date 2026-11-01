# ARGUS Spring Migration Code Review (Phase P4)

## 1. Executive Summary

- **Repository**: `ARGUS`
- **Branch**: `chore/stack-spring`
- **Baseline Commit**: `a4f03478f914ba2bc587eace2cc4f97973c16882`
- **Target Stack**: Spring Boot 4.1.2 on Java 25 (Temurin 25 / GraalVM 25)
- **Prior Stages Passed**:
  - P1: Spring Boot 4.1.2 compiles and tests pass on Java 17 (`41b9556634`)
  - P2: Runtime parity on Java 17 (G2 boot, G3 differential smoke 30/30 requests, G8 schema parity)
  - P3: Java 25 stage C2 (`658f124a20`) with Temurin 25 Dockerfile images (G1 verify, G2 boot, G3 smoke, G4 AOT processing, G7 scope, G8 schema)

This review covers the complete branch diff against baseline (`git diff $(cat ../baseline/sha)`), verifying adherence to `~/apps-gates/SPEC.md` hard rules, traps, and non-gate observable runtime behaviors.

---

## 2. Line-by-Line Spec Verification

### 2.1 Hard Rules (SPEC.md Section 2)

| Rule | Requirement | Verification | Status |
|---|---|---|---|
| Rule 1 | Work inside `repo/`; never write gate scripts, baselines, or run files | Only `springapp/**` and `docs/nightrun/**` touched | PASS |
| Rule 2 | Only gate MySQL from `../gate.env`; no other host; no AWS SDK / CLI calls | Verified. S3 operations remain mock/disabled without real credentials | PASS |
| Rule 3 | Never change ddl-auto, entity mappings, endpoint paths, HTTP methods, JSON shapes, status codes, security/CORS rules, or config values | Verified across all controllers, entities, and configuration files | PASS |
| Rule 4 | No `git commit`, `reset`, `checkout`, `stash`, `clean`, `rebase`, `push` | Verified. Git state left clean for driver commit | PASS |
| Rule 5 | Do not weaken, skip, delete, or `@Disabled` tests | Verified. Test suite preserved intact; 100% pass | PASS |
| Rule 6 | New dependencies only when build cannot work without one | Added `spring-boot-starter-validation` replacing conflicting unmanaged dependencies; no extraneous dependencies | PASS |
| Rule 7 | Never print or copy secrets | Verified. No secrets echoed or leaked into committed code | PASS |
| Rule 8 | Each gate run and verified before stopping | Verified with `spring-gate.sh current` | PASS |

### 2.2 Section 3 & 4 Migration Traps

- **Modular Starters**: `spring-boot-starter-web` replaced with `spring-boot-starter-webmvc`. Slices and autoconfig resolved properly.
- **Jackson 3**: Migrated from `com.fasterxml.jackson.databind.*` to `tools.jackson.databind.*` (`JsonNode`, `JsonMapper`). Annotations remain in `com.fasterxml.jackson.annotation`. HTTP serialization uses Jackson 3; `jjwt-jackson` remains isolated for internal JWT parsing.
- **Spring Framework 7 & Testing**: No `@MockBean`/`@SpyBean` in test suite; `HttpHeaders` is not treated as `MultiValueMap`.
- **Spring Security 7**: `spring-boot-starter-security` was commented out in baseline and remains commented out; custom `JwtAuthenticationFilter` implements Jakarta `Filter` and does not depend on deprecated Spring Security 7 APIs.
- **Hibernate 7**: Deprecated `spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.MySQL8Dialect` removed per spec; Hibernate auto-detects `MySQLDialect`. Entity mappings untouched.
- **Properties Migrator**: Tested with `spring-boot-properties-migrator` runtime dependency; zero deprecated/renamed property warnings detected. Migrator removed before phase close.
- **Native Builder**: `Dockerfile.native` updated to `ghcr.io/graalvm/native-image-community:25`.
- **Lombok**: No explicit `<version>` pin in dependency or `annotationProcessorPaths`; Boot 4 manages Lombok.
- **Java 25 (Stage C2)**: `java.version` set to `25`, `springapp/Dockerfile` uses `maven:3.9-eclipse-temurin-25` build and `eclipse-temurin:25-jre` runtime.

---

## 3. Non-Gate Observable Behavior Review

### 3.1 Authenticated Endpoints
- **Filter Chain**: `JwtAuthenticationFilter` (Order 2) runs after `CorsFilter` (HIGHEST_PRECEDENCE) and before `MockAuthenticationFilter` (Order 3).
- **Token Handling**: Standard `Authorization: Bearer <token>` extracted and verified with `jjwt-api` / `jjwt-impl` 0.12.3. User context populated in `UserContextHolder` for downstream controllers and services.
- **Exemptions**: Public endpoints (`/api/auth/*`, `/api/whatsapp/*`, `/api/public/*`, `/actuator/*`, `/health`, `/error`) and system endpoints bypass authentication as intended.

### 3.2 Write Paths
- **Endpoints**: `@PostMapping`, `@PutMapping`, `@DeleteMapping`, `@PatchMapping` in `ComplaintController`, `ComplaintStateController`, `DisputeController`, `ResolutionProofController`, `SLAController`, `UserController`, `CategoryController`, `CommunityController`.
- **Payload Handling**: Request bodies deserialized using Jackson 3 (`tools.jackson.databind.json.JsonMapper`).
- **Validation**: Jakarta validation annotations (`@Valid`, `@NotBlank`, `@Email`, `@NotNull`, `@Pattern`, `@Size`, `@Min`, `@Max`) executed via Hibernate Validator managed by `spring-boot-starter-validation`.
- **Multipart Uploads**: Multipart requests handled cleanly with `spring.servlet.multipart.*` properties supported in Boot 4 servlet configuration.

### 3.3 Scheduled Jobs
- **Scheduler**: `EscalationScheduler` annotated with `@Scheduled(cron = "${escalation.scheduler.cron:0 0 0/6 * * *}")`.
- **Application Configuration**: `@EnableScheduling` on `SpringappApplication`.
- **Execution**: Cron triggers and batch escalation processing in `EscalationService` retain identical semantics.

### 3.4 WebSocket & SockJS
- No server-side WebSocket or SockJS handlers configured in `springapp`.

### 3.5 CORS Configuration
- `CorsConfig` registers `CorsFilter` with `Ordered.HIGHEST_PRECEDENCE` over `/*`.
- Configures `*` allowed origins pattern, standard HTTP methods (GET, POST, PUT, DELETE, PATCH, OPTIONS), and credentials enabled.

### 3.6 Exception Handling & Status Codes
- `GlobalExceptionHandler` (`@RestControllerAdvice`) handles `MethodArgumentNotValidException` (400), `DuplicateResourceException` (409), `ResourceNotFoundException` (404), `InvalidStateTransitionException` (400), `UnauthorizedStateTransitionException` (403), `ComplaintOwnershipException` (403), `DepartmentMismatchException` (403), `ResolutionProofRequiredException` (422), `SignoffRequiredException` (422), `InvalidDisputeStateException` (400), `DuplicateDisputeException` (409), `IllegalArgumentException` (400), and generic `Exception` (500).
- Response shape `ErrorResponse` (timestamp, status, error, message, path, errors) is preserved.

### 3.7 Date / Number Formats in JSON
- Model timestamps use standard `java.time.LocalDateTime`.
- Serialized to ISO-8601 strings in Jackson 3, maintaining exact parity with baseline.

### 3.8 Lazy-Loading & Schema Integrity
- As specified in project conventions, `@ManyToOne` and `@OneToOne` relations remain EAGER.
- Existing database schema matches baseline (183 rows verified by gate G8).
- Report-only fresh-install nullability difference on `@CreationTimestamp` fields reflects Hibernate 7 DDL defaults and is deliberately left unmodified in entity classes to satisfy Hard Rule 3.

---

## 4. Review Findings

| ID | Severity | File:Line | Finding & Rationale | Status |
|---|---|---|---|---|
| F-01 | INFO | `springapp/pom.xml:9` | Parent upgraded to `org.springframework.boot:spring-boot-starter-parent:4.1.2` as required by SPEC.md Section 1. | Verified / Expected |
| F-02 | INFO | `springapp/pom.xml:31` | Java version property set to `25` per SPEC.md Section 1 & 4 (Stage C2). | Verified / Expected |
| F-03 | INFO | `springapp/pom.xml:40` | `spring-boot-starter-web` replaced with modular `spring-boot-starter-webmvc` per SPEC.md Section 3. | Verified / Expected |
| F-04 | INFO | `springapp/pom.xml:61-64` | `jakarta.validation-api` (3.0.2) and `hibernate-validator` (7.0.5.Final) replaced with Boot-managed `spring-boot-starter-validation`. | Verified / Expected |
| F-05 | INFO | `springapp/Dockerfile:1,11` | Build and runtime images updated to `maven:3.9-eclipse-temurin-25` and `eclipse-temurin:25-jre` per SPEC.md Section 1 & 4. | Verified / Expected |
| F-06 | INFO | `springapp/Dockerfile.native:1` | Native builder image updated to `ghcr.io/graalvm/native-image-community:25` per SPEC.md Section 1 & 3. | Verified / Expected |
| F-07 | INFO | `springapp/src/main/resources/application.properties:8` | Deprecated dialect pin `spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.MySQL8Dialect` removed per SPEC.md Section 3. | Verified / Expected |
| F-08 | INFO | `springapp/.../ChatController.java:6-7,31` | Ported to Jackson 3 `tools.jackson.databind.JsonNode` and `tools.jackson.databind.json.JsonMapper` per SPEC.md Section 3. | Verified / Expected |
| F-09 | INFO | `springapp/.../AIService.java:20-21,44` | Ported to Jackson 3 `JsonMapper.builder().build()` and `JsonNode` per SPEC.md Section 3. | Verified / Expected |
| F-10 | INFO | `springapp/.../DuplicateDetectionService.java:22-23,50` | Ported to Jackson 3 `JsonMapper.builder().build()` and `JsonNode` per SPEC.md Section 3. | Verified / Expected |
| F-11 | INFO | `springapp/.../ImageAnalysisService.java:3-4,51,321,336` | Ported to Jackson 3 `JsonMapper.builder().build()` and `JsonNode` per SPEC.md Section 3. | Verified / Expected |
| F-12 | INFO | `springapp/.../WhatsAppAgentService.java:7-8,48` | Ported to Jackson 3 `JsonMapper` and `JsonNode` per SPEC.md Section 3. | Verified / Expected |
| F-13 | INFO | `springapp/src/main/java/com/backend/springapp/model/ResolutionProof.java:134` | Compiler warning regarding Lombok `@Builder` ignoring field initializing expression in unmodified entity. Left untouched per Hard Rule 3. | Verified / No Action |
| F-14 | INFO | Schema: `argus_users.created_at`, etc. | Fresh-install DDL defaults in Hibernate 7 generate `nullable=false` for `@CreationTimestamp` fields. Gate G8 passed schema parity on existing DB. Entity mappings untouched per Hard Rule 3. | Verified / No Action |

---

## 5. Verification Command Result

Executing `bash ~/apps-gates/spring-gate.sh current` from repo root:
- STAGE: `check25`
- Java Home: `$JAVA25_HOME` (OpenJDK 25 Temurin)
- G7 Scope Check: PASSED (only `springapp/` and `docs/nightrun/` modified)
- G1 Maven Verify: PASSED
- Final Verdict: `GATE PASS [check25]`
