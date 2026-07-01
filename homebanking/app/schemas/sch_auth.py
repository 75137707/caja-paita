from pydantic import BaseModel, Field, field_validator


class LoginRequest(BaseModel):
    username: str = Field(..., examples=["cli000001"])
    password: str = Field(..., examples=["demo1234"])


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    codcliente: str
    nombre: str
    expires_in_minutes: int


# ---------------------------------------------------------------------------
# Registro de cliente nuevo (autoregistro a Caja Virtual)
# ---------------------------------------------------------------------------
class RegistroRequest(BaseModel):
    """
    Autoregistro: el postulante ya debe existir como cliente del banco
    (dcliente, dado de alta por un proceso KYC presencial/admin). Este
    endpoint solo crea sus credenciales de Caja Virtual (usuarios_homebanking),
    validando su identidad con DNI + datos de contacto que el banco ya tiene
    registrados.
    """
    tipodocumento: str = Field(default="DNI", examples=["DNI"])
    numerodocumento: str = Field(..., min_length=8, max_length=20, examples=["45896321"])
    email: str = Field(..., examples=["cliente@correo.com"])
    password: str = Field(..., min_length=8, max_length=72, examples=["MiClave2024!"])
    confirmar_password: str = Field(..., examples=["MiClave2024!"])

    @field_validator("numerodocumento")
    @classmethod
    def solo_numeros(cls, v: str) -> str:
        if not v.isdigit():
            raise ValueError("El número de documento solo debe contener dígitos.")
        return v

    @field_validator("confirmar_password")
    @classmethod
    def passwords_coinciden(cls, v: str, info):
        if "password" in info.data and v != info.data["password"]:
            raise ValueError("Las contraseñas no coinciden.")
        return v


class RegistroResponse(BaseModel):
    mensaje: str
    codcliente: str
    username: str


class VerificarClienteRequest(BaseModel):
    tipodocumento: str = Field(default="DNI", examples=["DNI"])
    numerodocumento: str = Field(..., min_length=8, max_length=20, examples=["45896321"])


class VerificarClienteResponse(BaseModel):
    elegible: bool
    motivo: str | None = None
    nombres: str | None = None
    codcliente: str | None = None
    email_parcial: str | None = None


# ---------------------------------------------------------------------------
# Apertura de cuenta — cliente totalmente NUEVO (sin relación previa con el
# banco). Distinto del autoregistro: aquí se crea el dcliente desde cero,
# como una apertura de cuenta presencial, más su cuenta de Ahorro Corriente
# inicial y su acceso a Caja Virtual, todo en un solo paso.
# ---------------------------------------------------------------------------
class AperturaClienteRequest(BaseModel):
    # Datos personales
    tipodocumento: str = Field(default="DNI", examples=["DNI"])
    numerodocumento: str = Field(..., min_length=8, max_length=20, examples=["72145896"])
    nombres: str = Field(..., min_length=2, max_length=80, examples=["Maria Fernanda"])
    apellidopaterno: str = Field(..., min_length=2, max_length=50, examples=["Quiroz"])
    apellidomaterno: str = Field(..., min_length=2, max_length=50, examples=["Saavedra"])
    fechanacimiento: str = Field(..., examples=["1998-04-12"])
    sexo: str = Field(..., examples=["F"])

    # Contacto
    email: str = Field(..., examples=["maria.quiroz@correo.com"])
    telefono: str = Field(..., min_length=6, max_length=20, examples=["969112233"])
    direccion: str = Field(..., min_length=5, max_length=150, examples=["Av. Grau 245, Paita"])

    # Datos económicos (necesarios para futuras solicitudes de crédito)
    ingresomensual: float = Field(..., ge=0, examples=[1800])
    fuenteingreso: str = Field(..., min_length=2, max_length=60, examples=["Dependiente - sector pesca"])

    # Credenciales de acceso a Caja Virtual
    password: str = Field(..., min_length=8, max_length=72, examples=["MiClave2024!"])
    confirmar_password: str = Field(..., examples=["MiClave2024!"])

    @field_validator("numerodocumento")
    @classmethod
    def solo_numeros_doc(cls, v: str) -> str:
        if not v.isdigit():
            raise ValueError("El número de documento solo debe contener dígitos.")
        return v

    @field_validator("telefono")
    @classmethod
    def solo_numeros_tel(cls, v: str) -> str:
        if not v.isdigit():
            raise ValueError("El teléfono solo debe contener dígitos.")
        return v

    @field_validator("sexo")
    @classmethod
    def sexo_valido(cls, v: str) -> str:
        v = v.upper()
        if v not in ("M", "F"):
            raise ValueError("Sexo debe ser 'M' o 'F'.")
        return v

    @field_validator("confirmar_password")
    @classmethod
    def passwords_coinciden_apertura(cls, v: str, info):
        if "password" in info.data and v != info.data["password"]:
            raise ValueError("Las contraseñas no coinciden.")
        return v


class AperturaClienteResponse(BaseModel):
    mensaje: str
    codcliente: str
    username: str
    nro_cuenta_ahorro: str
    agencia: str
