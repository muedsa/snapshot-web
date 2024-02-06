FROM gradle:8.6.0-jdk11 AS build
COPY --chown=gradle:gradle . /home/gradle/src
WORKDIR /home/gradle/src
RUN git clone https://github.com/muedsa/snapshot && \
    cd snapshot && \
    gradle jar --no-daemon && \
    echo 'Build jar:' && \
    ls build/libs && \
    cd .. && \
    cp -f snapshot/build/libs/*.jar libs/ && \
    gradle buildFatJar --no-daemon && \
    echo 'Build jar:' && \
    ls build/libs

FROM openjdk:11
EXPOSE 8080:8080
RUN apt-get update && \
    apt-get -y install libgl1-mesa-glx fonts-wqy-zenhei fonts-wqy-microhei fonts-arphic-ukai fonts-arphic-uming && \
    mkdir /app
COPY fonts/ /usr/share/fonts
COPY --from=build /home/gradle/src/build/libs/*.jar /app/snapshot-web-all.jar
ENTRYPOINT ["java","-jar","/app/snapshot-web-all.jar"]