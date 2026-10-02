# QRLatina Frontend

Prototipo QRL Connect para leer wallet QIP-55, saldo nativo QRL y tokens nuevos desplegados desde MyQRLWallet. El token activo de prueba es `LEQRL`.

Modo cableado a QRL testnet:

```shell
npm run frontend:dev
```

Luego ir a:

```text
http://127.0.0.1:5173
```

Modo estatico sin API:

```shell
python3 -m http.server 5173 --directory frontend
```

Luego ir a:

```text
http://localhost:5173
```
