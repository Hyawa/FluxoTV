# Walkthrough — Gerar APK assinado, publicar no GitHub e atualizar via Obtainium

Este guia cobre, do zero, como **você mesmo** gera o APK de release assinado, publica no
GitHub Releases e configura o **Obtainium** nos aparelhos (TV Box, celulares) para que as
atualizações sejam baixadas e instaladas automaticamente.

> App: **IPTV TVBox** · pacote `com.iptvbox.app` · projeto em `D:\Meus Projetos\IPTV`

---

## Índice

1. [O que já está pronto](#1-o-que-já-está-pronto)
2. [Pré-requisitos](#2-pré-requisitos)
3. [A chave de assinatura (keystore)](#3-a-chave-de-assinatura-keystore)
4. [Subir a versão a cada release](#4-subir-a-versão-a-cada-release)
5. [Gerar o APK de release assinado](#5-gerar-o-apk-de-release-assinado)
6. [Testar a instalação](#6-testar-a-instalação)
7. [Publicar no GitHub Releases](#7-publicar-no-github-releases)
8. [Instalar o Obtainium e configurar o auto-update](#8-instalar-o-obtainium-e-configurar-o-auto-update)
9. [Instalar em vários aparelhos](#9-instalar-em-vários-aparelhos)
10. [Como funciona o auto-update](#10-como-funciona-o-auto-update)
11. [Solução de problemas](#11-solução-de-problemas)
12. [(Opcional) Automatizar com GitHub Actions](#12-opcional-automatizar-com-github-actions)

---

## 1. O que já está pronto

Já configurado no projeto:

- `android/app/build.gradle` lê a assinatura de `android/app/keystore.properties` e aplica
  no `buildType` **release** automaticamente.
- `versionName` = `1.0.0` e `versionCode` = `1`.
- Keystore de release **já gerada** em `android/app/iptv-release.keystore`.
- `.gitignore` já ignora `*.keystore`, `*.jks` e `keystore.properties` (segredos não sobem pro Git).

O que **falta você fazer**: rodar o build, criar o repositório no GitHub, publicar o release
e instalar o Obtainium nos aparelhos.

---

## 2. Pré-requisitos

Você só precisa montar essa "caixa de ferramentas" uma vez.

### 2.1 Node.js

- Instale o **Node.js 18+** (ideal 20/22). Verifique:

```powershell
node -v
npm -v
```

### 2.2 JDK 21 (vem junto com o Android Studio)

O build do Android **precisa de JDK 11+** (usamos o **21**). O jeito mais fácil é instalar o
**Android Studio**, que traz o JDK em:

```
C:\Program Files\Android\Android Studio\jbr
```

> Importante: se o `java -version` do seu sistema for 1.8, **não use ele** — o build falha.
> Sempre aponte o `JAVA_HOME` para a pasta `jbr` do Android Studio (ver 2.4).

### 2.3 Android SDK

No Android Studio: **Settings → Languages & Frameworks → Android SDK** e instale:

- **Android SDK Platform** (API 34/35 — o que o `compileSdk` do projeto pedir)
- **Android SDK Build-Tools**
- **Android SDK Platform-Tools** (traz o `adb`)
- **Android SDK Command-line Tools**

O SDK normalmente fica em:

```
%LOCALAPPDATA%\Android\Sdk
```

### 2.4 Variáveis de ambiente (por sessão do PowerShell)

O `ANDROID_HOME` e o `JAVA_HOME` do sistema podem estar vazios. Defina **na sessão** antes de
compilar (é o que os comandos deste guia fazem):

```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
```

Para não repetir todo dia, você pode salvar de forma permanente (feche e reabra o terminal):

```powershell
setx JAVA_HOME "C:\Program Files\Android\Android Studio\jbr"
setx ANDROID_HOME "$env:LOCALAPPDATA\Android\Sdk"
```

### 2.5 Dependências do projeto

Na raiz do projeto:

```powershell
npm install
```

### 2.6 Ferramenta opcional: GitHub CLI (`gh`)

Facilita criar o repositório e publicar o release por linha de comando:

```powershell
winget install --id GitHub.cli
gh auth login
```

Se preferir, pode fazer tudo pelo site do GitHub (passo 7 mostra as duas formas).

---

## 3. A chave de assinatura (keystore)

A keystore é a "impressão digital" do app. **Toda atualização precisa ser assinada com a MESMA
chave**, senão o Android recusa instalar por cima (erro de assinatura). Guarde-a muito bem.

### 3.1 Estado atual do projeto

- Arquivo: `android/app/iptv-release.keystore`
- Alias: `iptv`
- Senha (store e key): `R4U63rRWA5qO7HKuxDMQQbEAh9ND`
- Validade: 10.000 dias

Credenciais em `android/app/keystore.properties` (já fora do Git):

```properties
storeFile=iptv-release.keystore
storePassword=R4U63rRWA5qO7HKuxDMQQbEAh9ND
keyAlias=iptv
keyPassword=R4U63rRWA5qO7HKuxDMQQbEAh9ND
```

> **Backup obrigatório:** copie `android/app/iptv-release.keystore` e o `keystore.properties`
> para um pendrive / nuvem privada. Sem isso, você não consegue mais atualizar o app instalado
> nos aparelhos — só desinstalando e instalando do zero.

### 3.2 (Se quiser) gerar uma keystore nova

Só faça isso se perder a atual ou quiser começar do zero (exige desinstalar o app dos aparelhos).

```powershell
$keytool = "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe"

& $keytool -genkeypair -v `
  -keystore "android\app\iptv-release.keystore" `
  -alias iptv `
  -keyalg RSA -keysize 2048 -validity 10000 `
  -storepass "SUA_SENHA_FORTE" -keypass "SUA_SENHA_FORTE" `
  -dname "CN=IPTV TVBox, OU=Casa, O=IPTV, L=Sao Paulo, S=SP, C=BR"
```

Depois atualize `android/app/keystore.properties` com a mesma senha.

---

## 4. Subir a versão a cada release

Antes de **cada** novo release, aumente a versão em `android/app/build.gradle`:

```gradle
defaultConfig {
    applicationId "com.iptvbox.app"
    minSdkVersion rootProject.ext.minSdkVersion
    targetSdkVersion rootProject.ext.targetSdkVersion
    versionCode 2          // SEMPRE +1 a cada release (número inteiro)
    versionName "1.0.1"    // versão "de vitrine" (aparece no Obtainium)
}
```

Regras:

- `versionCode` **só aumenta** (1, 2, 3, ...). É o que o Android/Obtainium usam pra saber que há
  versão nova.
- `versionName` é o texto exibido (ex.: `1.0.1`, `1.1.0`).

> Dica: combine o nome do APK com a versão (ex.: `iptv-tvbox-1.0.1.apk`) para ficar fácil de achar.

---

## 5. Gerar o APK de release assinado

Sempre que mudar o código web (React/TS) ou o backend (`server/`), primeiro **rebuilda e
sincroniza** os assets para o Android:

```powershell
# na raiz do projeto
npm run sync
```

> `npm run sync` = `npm run build` (backend + web) + `cap sync android`.

Depois compile o release assinado:

```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"

cd android
.\gradlew.bat clean assembleRelease
```

O APK sai em:

```
android\app\build\outputs\apk\release\app-release.apk
```

(Se por algum motivo a assinatura não for aplicada, pode aparecer
`app-release-unsigned.apk` — isso indicaria que o `keystore.properties` não foi encontrado.)

### 5.1 Conferir a assinatura (opcional)

```powershell
$apksigner = "$env:LOCALAPPDATA\Android\Sdk\build-tools\35.0.0\apksigner.bat"
& $apksigner verify --print-certs "android\app\build\outputs\apk\release\app-release.apk"
```

> Ajuste `35.0.0` para a versão de build-tools que estiver instalada
> (`Get-ChildItem "$env:LOCALAPPDATA\Android\Sdk\build-tools"`).

### 5.2 Renomear para subir no release (recomendado)

```powershell
Copy-Item "android\app\build\outputs\apk\release\app-release.apk" `
          "android\app\build\outputs\apk\release\iptv-tvbox-1.0.1.apk"
```

---

## 6. Testar a instalação

### 6.1 Com o aparelho conectado por USB (adb)

Habilite **Depuração USB** no aparelho e rode:

```powershell
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
& $adb install -r "android\app\build\outputs\apk\release\app-release.apk"
```

`-r` reinstala mantendo os dados. Se der erro de assinatura, veja o passo 11.1.

### 6.2 Sem cabo (copiar o arquivo)

Mande o `.apk` por **WhatsApp / Telegram / Google Drive / pendrive** para o aparelho, abra o
arquivo e autorize **"Instalar de fontes desconhecidas"** para o app que estiver abrindo.

---

## 7. Publicar no GitHub Releases

O Obtainium lê os releases do GitHub. Cada release = uma versão do app.

### 7.1 Criar o repositório (uma vez)

**Pelo site:**

1. Acesse <https://github.com/new>.
2. Nome sugerido: `iptv-tvbox`. Visibilidade **Público** (o Obtainium acessa sem token) ou
   Privado (aí precisa configurar token no Obtainium).
3. Crie o repositório.

**Pelo `gh`:**

```powershell
gh repo create iptv-tvbox --public --source=. --remote=origin --push
```

### 7.2 Enviar o código (opcional, mas recomendado)

```powershell
git init
git add .
git commit -m "IPTV TVBox 1.0.0"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/iptv-tvbox.git
git push -u origin main
```

> Lembre: a keystore e o `keystore.properties` **não** vão (estão no `.gitignore`).

### 7.3 Criar o release e anexar o APK

**Pelo site:**

1. No repositório, clique em **Releases → Draft a new release**.
2. **Tag**: `v1.0.1` (crie a tag na hora).
3. **Title**: `IPTV TVBox 1.0.1`.
4. **Describe this release**: escreva o que mudou.
5. Arraste o arquivo `iptv-tvbox-1.0.1.apk` para a área **Attach binaries**.
6. Clique em **Publish release**.

**Pelo `gh`:**

```powershell
gh release create v1.0.1 "android\app\build\outputs\apk\release\iptv-tvbox-1.0.1.apk" `
  --title "IPTV TVBox 1.0.1" `
  --notes "Correções e melhorias."
```

Pronto — o APK agora está hospedado e tem uma URL pública do tipo:

```
https://github.com/SEU_USUARIO/iptv-tvbox/releases/latest
```

---

## 8. Instalar o Obtainium e configurar o auto-update

O **Obtainium** instala e atualiza apps direto de fontes como o GitHub Releases.

### 8.1 Instalar o Obtainium (em cada aparelho)

1. Baixe o APK oficial em <https://github.com/ImranR98/Obtainium/releases/latest>
   (arquivo `app-release.apk`).
2. Instale e autorize **"Instalar apps desconhecidos"** para o Obtainium.

### 8.2 Adicionar o seu app

1. Abra o Obtainium → **Add App**.
2. Em **App Source URL**, cole a URL do repositório:
   ```
   https://github.com/SEU_USUARIO/iptv-tvbox
   ```
   (ou a URL do release: `https://github.com/SEU_USUARIO/iptv-tvbox/releases/latest`)
3. Toque em **Add**. O Obtainium vai ler a última versão e baixar o APK.
4. Instale quando ele pedir (confirmar instalação é normal).

### 8.3 Ajustes úteis no Obtainium

- **Auto-update (ou "Check for updates")**: deixe ligado para checar periodicamente e baixar
  versões novas sozinho.
- **"Install automatically"**: se o aparelho permitir, ele instala sem você tocar.
- **APK filter** (se você subir mais de um `.apk` por release): use algo como `iptv-tvbox-`.
- **Fallback/nightly**: não precisa para o nosso caso.

---

## 9. Instalar em vários aparelhos

Para **cada** aparelho (TV Box, celulares dos pais, etc.):

1. Instale o **Obtainium** (passo 8.1).
2. Adicione o app uma vez (passo 8.2).
3. Pronto — naquele aparelho o app passa a se atualizar sozinho.

Depois disso, **seu fluxo de atualização** é:

```
mudou o código  ->  sobe o versionCode/versionName  ->  npm run sync  ->  assembleRelease
                ->  publica o APK no GitHub Releases  ->  os aparelhos atualizam via Obtainium
```

Instalação manual (USB/WhatsApp/Drive) continua funcionando como alternativa para um aparelho
novo, sem Obtainium.

---

## 10. Como funciona o auto-update

- O Obtainium compara o **`versionCode`/`versionName`** do APK do release com o que está
  instalado.
- Se o release tiver `versionCode` maior, ele baixa e oferece/instala a atualização.
- Por isso: **sempre aumente o `versionCode`** antes de gerar um APK novo (passo 4).
- Só funciona se o APK novo estiver assinado com a **mesma keystore** do instalado.

---

## 11. Solução de problemas

### 11.1 "App not installed" / conflito de assinatura

- A causa mais comum é assinatura diferente (keystore trocada).
- Solução: desinstale o app no aparelho e instale o novo APK. Depois disso as próximas
  atualizações funcionam.
- Confirme que está usando a keystore correta (seção 3).

### 11.2 Build falha com erro de Java / "Unsupported class file major version"

- `JAVA_HOME` apontando para o Java errado. Use sempre:
  ```powershell
  $env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
  ```

### 11.3 Build falha com "SDK location not found"

- Defina o `ANDROID_HOME` na sessão (passo 2.4) ou crie `android/local.properties` com:
  ```
  sdk.dir=C:\\Users\\SEU_USUARIO\\AppData\\Local\\Android\\Sdk
  ```

### 11.4 APK sai como `app-release-unsigned.apk`

- O `keystore.properties` não foi encontrado em `android/app/`. Verifique se o arquivo existe e
  se o `storeFile=iptv-release.keystore` aponta para um arquivo presente na pasta `android/app/`.

### 11.5 App web não carrega / canais não aparecem

- Rode `npm run sync` antes de compilar (isso copia o `dist/` e o backend para dentro do Android).
- O backend embarcado (Node) roda em `http://127.0.0.1:8787` — não precisa de configuração.

### 11.6 Obtainium não encontra a atualização

- Verifique se o **`versionCode` foi incrementado** e se o release do GitHub está **publicado**
  (não em rascunho).
- Se o repositório for **privado**, configure um token de acesso no Obtainium.
- Ajuste o **APK filter** se houver mais de um `.apk` no release.

### 11.7 Não consigo instalar "de fontes desconhecidas"

- Android 8+: autorize o app que está abrindo o APK (WhatsApp, Drive, Arquivos) ou o próprio
  Obtainium em **Configurações → Apps → Acesso especial → Instalar apps desconhecidos**.

---

## 12. (Opcional) Automatizar com GitHub Actions

Dá para o GitHub **gerar o APK sozinho** ao criar uma tag. Você precisa guardar a keystore como
"secret" do repositório.

1. Transforme a keystore em base64:
   ```powershell
   [Convert]::ToBase64String([IO.File]::ReadAllBytes("android\app\iptv-release.keystore")) | Set-Content keystore.b64
   ```
2. No GitHub: **Settings → Secrets and variables → Actions**, crie:
   - `KEYSTORE_BASE64` = conteúdo do `keystore.b64`
   - `KEYSTORE_PASSWORD` = a senha
   - `KEY_ALIAS` = `iptv`
   - `KEY_PASSWORD` = a senha
3. Crie `.github/workflows/release.yml` que: faz checkout, instala Node/JDK, roda `npm ci`,
   `npm run sync`, decodifica a keystore, roda `gradlew assembleRelease` e faz upload do APK no
   release com `softprops/action-gh-release`.

Isso é 100% opcional — o fluxo manual da seção 7 já resolve. Se quiser, é só pedir que eu
monto o workflow.

---

Bom proveito. Qualquer dúvida em qualquer passo, me chama.
