# ARGUS

Spring Boot 3.5.4 + React grievance/complaint management system.

## Native image status

DONE. Tag: `roguekishore/argus:graal`
Always verify the live digest:
```bash
sudo docker inspect -f '{{.RepoDigests}}' roguekishore/argus:graal
```

Compose settings (live on the box, checked 2026-10-11):
```yaml
command: ["-Xmx128m"]
mem_limit: 192m
memswap_limit: 192m
```
Idle on the box: ~56 MiB.

## Build and push (GitHub Actions)

Actions -> Build and Push -> Run workflow: pick the branch, type a tag. It builds `springapp/Dockerfile.native`
(the plain `Dockerfile` is a JVM build), smoke-tests the binary, and pushes only `roguekishore/argus:<tag>`.
The box pulls `:graal`, so to ship: run with tag `graal`, then on the box
`sudo docker-compose pull argus && sudo docker-compose up -d argus`.
No run has happened yet as of 2026-10-11. Details: `../.deployment/ci/RUNBOOK.md`; the box: `../.deployment/CLAUDE.md`.

## Project-specific native gotchas

- Boot 3.5.x → GraalVM 17 is fine.
- JJWT version: **0.12.3** (538 classes). Never copy reflect-config from vantage (0.12.6).
- Twilio SDK removed — replaced with `java.net.http.HttpClient` in `TwilioService.java`. `TwilioConfig.java` has no `@PostConstruct`.
- AWS SDK v2 present (S3). `S3Client` uses `UrlConnectionHttpClient.create()`. `S3Presigner` has no `httpClient()` method — don't try to set one.
- All `@ManyToOne`/`@OneToOne` are EAGER (User, SLA, Complaint, EscalationEvent, CitizenSignoff, ResolutionProof, ComplaintUpvote).
- AWS SDK v2 bloats native binary significantly even with apache-client/netty-nio-client excluded.

## Lambda blocker (future)

`@Scheduled` (EscalationScheduler) and `@Async` (ImageAnalysisService) block Lambda migration.
Do not attempt Lambda packaging until both are removed or refactored.

## GraalVM shared lessons

@../.claude/graalvm-lessons.md
