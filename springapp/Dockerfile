FROM maven:3.9-eclipse-temurin-17 AS build

WORKDIR /app

COPY pom.xml .
RUN mvn dependency:go-offline

COPY src ./src
RUN mvn clean package -DskipTests

FROM eclipse-temurin:17-jre-jammy

WORKDIR /app

COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080

# Memory caps for co-deployment on t4g.small (2GB total RAM shared across 3 containers)
# Argus is heavier (JWT, S3, Twilio, scheduling) so gets slightly more heap
ENV JAVA_OPTS="-Xms64m -Xmx200m -XX:MaxMetaspaceSize=80m -XX:+UseSerialGC -XX:+ExitOnOutOfMemoryError"

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
