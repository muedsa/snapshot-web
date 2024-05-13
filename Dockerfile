FROM gradle:8.6.0-jdk11 AS build
COPY --chown=gradle:gradle . /home/gradle/snapshot-web
WORKDIR /home/gradle
RUN git clone https://github.com/muedsa/snapshot && \
    cd snapshot && \
    gradle jar --no-daemon && \
    cd .. && \
    if [ ! -d "/home/gradle/snapshot-web/libs" ]; then mkdir /home/gradle/snapshot-web/libs; fi && \
    cp -f snapshot/core/build/libs/*.jar snapshot-web/libs/ && \
    cp -f snapshot/parser/build/libs/*.jar snapshot-web/libs/ && \
    cd snapshot-web && \
    gradle buildFatJar --no-daemon

FROM openjdk:11
ENV TZ=Asia/Shanghai
EXPOSE 8080:8080
RUN ln -fs /usr/share/zoneinfo/${TZ} /etc/localtime && \
    echo ${TZ} > /etc/timezone &&\
    dpkg-reconfigure --frontend noninteractive tzdata && \
    rm -rf /var/lib/apt/lists/* && \
    DEBIAN_FRONTEND=noninteractive apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get -y install libgl1-mesa-glx \
    fonts-wqy-zenhei fonts-wqy-microhei fonts-arphic-ukai fonts-arphic-uming && \
    mkdir /app
COPY fonts/ /usr/share/fonts
COPY --from=build /home/gradle/snapshot-web/build/libs/*.jar /app/snapshot-web-all.jar
ENTRYPOINT ["java","-jar","/app/snapshot-web-all.jar"]