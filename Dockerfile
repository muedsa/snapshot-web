FROM gradle:7-jdk11 AS build
COPY --chown=gradle:gradle . /home/gradle/src
WORKDIR /home/gradle/src
RUN gradle buildFatJar --no-daemon

FROM openjdk:11
EXPOSE 8080:8080
RUN apt-get update && apt-get install libgl1-mesa-glx
RUN mkdir /app
COPY --from=build /home/gradle/src/build/libs/*.jar /app/snapshot-web-all.jar
ENTRYPOINT ["java","-jar","/app/snapshot-web-all.jar"]