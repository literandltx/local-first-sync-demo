# --- Stage 1: Build ---
FROM eclipse-temurin:17-jdk AS build
WORKDIR /app

# Copy the entire backend project into the container
COPY . .

#RUN --mount=type=cache,target=/root/.gradle \
#    ./gradlew clean bootJar -x test

RUN ./gradlew clean bootJar -x test

# --- Stage 2: Runtime ---
FROM eclipse-temurin:17-jre
WORKDIR /app

# Copy the built jar from Gradle's output directory
COPY --from=build /app/build/libs/*.jar app.jar

EXPOSE 8080

# Run with container-aware memory settings
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]
