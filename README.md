# Snapshot Web Service Demo

[Snapshot](https://github.com/muedsa/snapshot) 是一个图片生成工具, 本项目是Demo提供了一个图片生成服务。

## API
Host: `https://snapshot.muedsa.com`

<details>
 <summary><code>POST</code> <code>/snapshot</code> 生成图片</summary>

##### Parameters

dom like text as row request body, example:
```html
<Snapshot background="#FFFFFFFF" type="png">
    <Column>
        <Row>
            <Container color="#FF0000" width="200" height="200" />
            <Container color="#FFFFFF" width="200" height="200">
                <Text color="#0000FF" fontSize="20">哈哈 233<![CDATA[ken_test <a></a> 233 哈哈]]>哈🤣🤣🤣
                </Text>
            </Container>
        </Row>
        <Row>
            <Image width="200" height="200" url="https://samples-files.com/samples/Images/png/480-360-sample.png"
                fit="COVER" />
            <Container color="#FFFF00" width="200" height="200" />
        </Row>
    </Column>
</Snapshot>
```

##### Responses

Image ByteArray data, reponse header `Content-Type`: `image/png`, `image/jpeg`, `image/webp`

Example:

![response](https://github.com/muedsa/snapshot/raw/main/sample_parse_dom_like.png)

</details>

<details>
 <summary><code>GET</code> <code>/fonts</code> 可用字体</summary>

##### Responses

Raw text, available font famliy name list
</details>

<details>
 <summary><code>GET</code> <code>/fonts.png</code> 可用字体示例图片</summary>

![fonts image](https://snapshot.muedsa.com/fonts.png)

</details>
