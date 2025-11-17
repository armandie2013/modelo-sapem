// === Utilidades de texto ===
function capitalizarCadaPalabra(texto) {
  return (texto || "").toLowerCase().replace(/\b\w/g, function (l) {
    return l.toUpperCase();
  });
}

function capitalizarOracion(texto) {
  var limpio = (texto || "").trim().toLowerCase();
  if (!limpio) return "";
  return limpio.charAt(0).toUpperCase() + limpio.slice(1);
}

// === Utilidades numéricas ===
function convertirAFloat(valor) {
  if (!valor) return 0;
  var s = String(valor).replace(/\./g, "").replace(",", ".");
  var n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function formatArg(valor) {
  var n = Number(valor) || 0;
  return n.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function parseAnyNumberLike(str) {
  var s = (str || "").trim();
  if (!s) return null;
  var lastComma = s.lastIndexOf(",");
  var lastDot = s.lastIndexOf(".");
  var decSep = null;
  if (lastComma > -1 || lastDot > -1) {
    decSep = lastComma > lastDot ? "," : ".";
  }
  if (decSep === ",") {
    s = s.replace(/\./g, "");
    s = s.replace(",", ".");
  } else if (decSep === ".") {
    s = s.replace(/,/g, "");
  } else {
    s = s.replace(/[.,\s]/g, "");
  }
  var n = Number(s);
  return (Number.isFinite ? Number.isFinite(n) : isFinite(n)) && n >= 0
    ? n
    : null;
}

// === Máscara de moneda tipo REGISTRAR PAGO, generalizada ===
function initMascaraMoneda(input) {
  if (!input) return;

  var intDigits = "";
  var decDigits = ["0", "0"];
  var editingDecimals = false;
  var decPos = 0;

  function fmtMiles(s) {
    s = s || "0";
    s = s.replace(/^0+(?=\d)/, "");
    if (s === "") s = "0";
    return s.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }

  function fromNumber(n) {
    n = Number(n) || 0;
    if (n < 0) n = 0;
    var entero = Math.trunc(Math.abs(n)).toString();
    var dec = Math.round((Math.abs(n) % 1) * 100)
      .toString()
      .padStart(2, "0");
    intDigits = entero.replace(/^0+(?=\d)/, "");
    if (intDigits === "") intDigits = "0";
    decDigits = [dec[0], dec[1]];
  }

  function render() {
    var visible = fmtMiles(intDigits) + "," + decDigits.join("");
    input.value = visible;

    // Si está bloqueado, no movemos el cursor ni recalculamos nada
    if (input.readOnly || input.disabled) return;

    requestAnimationFrame(function () {
      var commaIndex = visible.indexOf(",");
      var pos = editingDecimals ? commaIndex + 1 + decPos : commaIndex;
      pos = Math.max(0, Math.min(visible.length, pos));
      try {
        input.setSelectionRange(pos, pos);
      } catch (e) {}
    });

    if (typeof calcularTotales === "function") {
      calcularTotales();
    }
  }

  function syncFromInputText() {
    var n = parseAnyNumberLike(input.value);
    if (n === null) {
      intDigits = "0";
      decDigits = ["0", "0"];
    } else {
      fromNumber(n);
    }
    editingDecimals = false;
    decPos = 0;
    render();
  }

  // Init desde valor actual
  syncFromInputText();

  input.addEventListener("beforeinput", function (e) {
    // 🚫 Si el campo está bloqueado, no dejamos escribir
    if (input.readOnly || input.disabled) {
      e.preventDefault();
      return;
    }

    var t = e.inputType;
    var d = e.data;

    // Insertar dígitos
    if (t === "insertText" && d && /[0-9]/.test(d)) {
      e.preventDefault();
      if (editingDecimals) {
        if (decPos < 2) {
          decDigits[decPos] = d;
          decPos++;
        } else {
          decPos = 0;
          decDigits[decPos] = d;
          decPos = 1;
        }
      } else {
        intDigits += d;
        intDigits = intDigits.replace(/^0+(?=\d)/, "");
        if (intDigits === "") intDigits = "0";
      }
      render();
      return;
    }

    // Cambiar a edición de decimales
    if (t === "insertText" && (d === "," || d === ".")) {
      e.preventDefault();
      editingDecimals = true;
      decPos = 0;
      render();
      return;
    }

    // Backspace
    if (t === "deleteContentBackward") {
      e.preventDefault();
      if (editingDecimals) {
        if (decPos > 0) {
          decPos--;
          decDigits[decPos] = "0";
        } else {
          editingDecimals = false;
        }
      } else {
        if (intDigits.length > 1) {
          intDigits = intDigits.slice(0, -1);
        } else {
          intDigits = "0";
        }
      }
      render();
      return;
    }

    // Pegar
    if (t === "insertFromPaste") {
      e.preventDefault();
      var txt = d || "";
      var done = false;

      var handleText = function (text) {
        var n = parseAnyNumberLike(text);
        if (n === null) return;
        fromNumber(n);
        editingDecimals = false;
        decPos = 0;
        render();
      };

      try {
        var clip = e.clipboardData || window.clipboardData;
        if (clip) {
          txt = clip.getData("text") || txt;
          handleText(txt);
          done = true;
        }
      } catch (err) {}

      if (!done && txt) {
        handleText(txt);
      }
      return;
    }

    // Bloqueamos otros tipos
    e.preventDefault();
  });

  input.addEventListener("click", function () {
    if (input.readOnly || input.disabled) return;

    var visible = input.value || "";
    var commaIndex = visible.indexOf(",");
    if (commaIndex < 0) {
      editingDecimals = false;
      decPos = 0;
      render();
      return;
    }

    var caret = input.selectionStart || 0;
    var isZero = fmtMiles(intDigits) === "0" && decDigits.join("") === "00";

    if (isZero) {
      editingDecimals = false;
      decPos = 0;
      render();
      return;
    }

    if (caret > commaIndex) {
      editingDecimals = true;
      var after = caret - (commaIndex + 1);
      if (after <= 0) decPos = 0;
      else if (after === 1) decPos = 1;
      else decPos = 2;
      if (decPos >= 2) decPos = 1;
    } else {
      editingDecimals = false;
      decPos = 0;
    }
    render();
  });

  input.addEventListener("focus", function () {
    if (input.readOnly || input.disabled) return;

    if (!input.value) {
      intDigits = "0";
      decDigits = ["0", "0"];
      editingDecimals = false;
      decPos = 0;
      render();
    } else {
      input.dispatchEvent(new Event("click"));
    }
  });

  input.addEventListener("keypress", function (e) {
    if (input.readOnly || input.disabled) {
      e.preventDefault();
      return;
    }
    var ch = e.key || "";
    if (!/[0-9.,]/.test(ch)) {
      e.preventDefault();
    }
  });
}

// === Cálculo de totales ===
function calcularTotales() {
  var totalViatico = 0;

  var importes = document.querySelectorAll(".importe");
  importes.forEach(function (input) {
    totalViatico += convertirAFloat(input.value);
  });

  var adicionalEl = document.getElementById("adicionalEnEfectivo");
  var devueltoEl = document.getElementById("devolucionEnEfectivo");
  var adicional = adicionalEl ? convertirAFloat(adicionalEl.value) : 0;
  var devuelto = devueltoEl ? convertirAFloat(devueltoEl.value) : 0;

  var pendiente = adicional - devuelto;
  if (pendiente < 0) pendiente = 0;

  var cantidadValeEl = document.getElementById("cantidadVale");
  var valorValeEl = document.getElementById("valorVale");
  var totalValeEl = document.getElementById("totalVale");

  var cantidadVale = cantidadValeEl
    ? parseInt(cantidadValeEl.value || "0", 10)
    : 0;
  if (isNaN(cantidadVale)) cantidadVale = 0;
  var valorVale = valorValeEl ? convertirAFloat(valorValeEl.value) : 0;
  var totalVales = cantidadVale * valorVale;

  if (totalValeEl) {
    totalValeEl.value = totalVales ? formatArg(totalVales) : "0,00";
  }

  var totalARecibir = totalViatico + adicional;

  var totalViaticoSpan = document.getElementById("totalViatico");
  if (totalViaticoSpan) {
    totalViaticoSpan.textContent = formatArg(totalViatico);
  }

  var pendienteInput = document.getElementById("pendienteDeRendicion");
  if (pendienteInput) {
    pendienteInput.value = formatArg(pendiente);
  }

  var totalARecibirInput = document.getElementById("totalARecibir");
  if (totalARecibirInput) {
    totalARecibirInput.value = formatArg(totalARecibir);
  }

  var hiddenTotal = document.getElementById("montoTotalViaticoHidden");
  if (hiddenTotal) {
    hiddenTotal.value = totalViatico.toFixed(2);
  }

  var hiddenPendiente = document.getElementById("pendienteDeRendicionHidden");
  if (hiddenPendiente) {
    hiddenPendiente.value = pendiente.toFixed(2);
  }
}

// === DOMContentLoaded ===
document.addEventListener("DOMContentLoaded", function () {
  // ===== Capitalización de textos =====

  // Área solicitante: cada palabra con mayúscula
  var areaEl = document.querySelector('[name="areaSolicitante"]');
  if (areaEl) {
    areaEl.addEventListener("blur", function () {
      areaEl.value = capitalizarCadaPalabra(areaEl.value);
    });
  }

  // Origen, Destino y Motivo del viaje: solo primera letra en mayúscula
  ["origen", "destino", "motivoDelViaje"].forEach(function (name) {
    var el = document.querySelector('[name="' + name + '"]');
    if (el) {
      el.addEventListener("blur", function () {
        el.value = capitalizarOracion(el.value);
      });
    }
  });

  // Vehículo utilizado: todo mayúsculas
  var vehiculoEl = document.querySelector('[name="vehiculoUtilizado"]');
  if (vehiculoEl) {
    vehiculoEl.addEventListener("blur", function () {
      vehiculoEl.value = (vehiculoEl.value || "").toUpperCase();
    });
  }

  // ===== Campos monetarios y lógicas de cálculo =====
  var adicionalEl = document.getElementById("adicionalEnEfectivo");
  var devueltoEl = document.getElementById("devolucionEnEfectivo");
  var valorValeEl = document.getElementById("valorVale");
  var totalValeEl2 = document.getElementById("totalVale");
  var cantidadValeEl2 = document.getElementById("cantidadVale");
  var cantViajantesSel = document.getElementById("cantidadDeViajantes");

  // 🚫 Al inicio: TODOS los importes bloqueados hasta que haya viajante válido
  document.querySelectorAll(".importe").forEach(function (inp) {
    inp.readOnly = true;
    inp.classList.add("bg-gray-100");
  });

  // Helper: habilitar/deshabilitar importe por fila según:
  // - que la fila esté activa según cantidadDeViajantes
  // - que haya viajante seleccionado (no vacío)
  function actualizarEstadoImportePorFila(idx) {
    var importe = document.getElementById("importeViatico-" + idx);
    var viajanteSel = document.getElementById("viajante-" + idx);
    if (!importe) return;

    var cant = cantViajantesSel
      ? parseInt(cantViajantesSel.value || "0", 10)
      : 0;
    if (isNaN(cant) || cant < 0) cant = 0;

    var filaActiva = idx < cant;
    var tieneViajante = viajanteSel && viajanteSel.value;

    var habilitar = filaActiva && !!tieneViajante;

    importe.readOnly = !habilitar;
    importe.classList.toggle("bg-gray-100", !habilitar);
    if (!habilitar) {
      importe.value = "";
    }

    calcularTotales();
  }

  // Aplicar máscara a todos los campos monetarios
  var camposMoneda = [];
  document.querySelectorAll(".importe").forEach(function (el) {
    camposMoneda.push(el);
  });
  if (adicionalEl) camposMoneda.push(adicionalEl);
  if (devueltoEl) camposMoneda.push(devueltoEl);
  if (valorValeEl) camposMoneda.push(valorValeEl);

  camposMoneda.forEach(function (el) {
    initMascaraMoneda(el);
  });

  // Inicializar campos de solo lectura monetarios
  var pendientes = document.getElementById("pendienteDeRendicion");
  if (pendientes && !pendientes.value) pendientes.value = "0,00";
  var totalRec = document.getElementById("totalARecibir");
  if (totalRec && !totalRec.value) totalRec.value = "0,00";
  if (totalValeEl2 && !totalValeEl2.value) totalValeEl2.value = "0,00";

  // Recalcular totales si cambia cantidad de vales
  if (cantidadValeEl2) {
    cantidadValeEl2.addEventListener("input", calcularTotales);
  }

  // Cantidad de viajantes: habilitar / deshabilitar filas base
  function actualizarCamposViajantes() {
    if (!cantViajantesSel) return;
    var cant = parseInt(cantViajantesSel.value || "0", 10);
    if (isNaN(cant) || cant < 0) cant = 0;

    var selects = document.querySelectorAll(".viajante-select");

    selects.forEach(function (sel, idx) {
      var deshabilitado = idx >= cant;
      sel.disabled = deshabilitado;
      sel.classList.toggle("bg-gray-100", deshabilitado);
      if (deshabilitado) {
        sel.value = "";
        sel.dataset.prevValue = ""; // reset valor previo
        var cargoInput = document.getElementById("cargo-" + idx);
        var importe = document.getElementById("importeViatico-" + idx);
        if (cargoInput) cargoInput.value = "";
        if (importe) {
          importe.value = "";
          importe.readOnly = true;
          importe.classList.add("bg-gray-100");
        }
      }
      // asegurar estado del importe según viajante actual
      actualizarEstadoImportePorFila(idx);
    });

    calcularTotales();
  }

  if (cantViajantesSel) {
    cantViajantesSel.addEventListener("change", actualizarCamposViajantes);
  }

  // Sincronizar cargo y evitar viajantes duplicados
  var selectsViajantes = document.querySelectorAll(".viajante-select");

  // Inicializar prevValue
  selectsViajantes.forEach(function (sel) {
    sel.dataset.prevValue = sel.value || "";
  });

  selectsViajantes.forEach(function (sel, idx) {
    sel.addEventListener("change", function () {
      var nuevoValor = sel.value;
      var prevValor = sel.dataset.prevValue || "";

      // Si está vacío: limpiar cargo e importe y deshabilitar importe
      if (!nuevoValor) {
        var cargoInput = document.getElementById("cargo-" + idx);
        if (cargoInput) cargoInput.value = "";
        sel.dataset.prevValue = "";
        actualizarEstadoImportePorFila(idx);
        return;
      }

      // Verificar duplicados
      var duplicado = false;
      var todos = document.querySelectorAll(".viajante-select");
      todos.forEach(function (otroSel, j) {
        if (j === idx) return;
        if (otroSel.value && otroSel.value === nuevoValor) {
          duplicado = true;
        }
      });

      if (duplicado) {
        alert("No se puede ingresar viajantes duplicados.");
        // Volver al valor anterior
        sel.value = prevValor;

        // Actualizar cargo según valor anterior
        var cargoInput2 = document.getElementById("cargo-" + idx);
        if (cargoInput2) {
          if (prevValor) {
            var optPrev = Array.from(sel.options).find(function (o) {
              return o.value === prevValor;
            });
            cargoInput2.value = optPrev
              ? optPrev.getAttribute("data-cargo") || ""
              : "";
          } else {
            cargoInput2.value = "";
          }
        }

        actualizarEstadoImportePorFila(idx);
        return;
      }

      // No duplicado: actualizar cargo y habilitar importe
      var opt = sel.options[sel.selectedIndex];
      var cargo = opt ? opt.getAttribute("data-cargo") : "";
      var cargoInput = document.getElementById("cargo-" + idx);
      if (cargoInput) {
        cargoInput.value = cargo || "";
      }

      sel.dataset.prevValue = nuevoValor;
      actualizarEstadoImportePorFila(idx);
    });
  });

  // Validación de fechas
  var fechaSalidaInput = document.querySelector(
    'input[name="fechaDeSalida"]'
  );
  var fechaLlegadaInput = document.querySelector(
    'input[name="fechaDellegada"]'
  );
  function validarFechas() {
    if (!fechaSalidaInput || !fechaLlegadaInput) return;
    if (!fechaSalidaInput.value || !fechaLlegadaInput.value) return;
    var salida = new Date(fechaSalidaInput.value);
    var llegada = new Date(fechaLlegadaInput.value);
    if (llegada < salida) {
      alert("La fecha de llegada no puede ser anterior a la fecha de salida.");
      fechaLlegadaInput.value = "";
    }
  }
  if (fechaSalidaInput && fechaLlegadaInput) {
    fechaSalidaInput.addEventListener("change", validarFechas);
    fechaLlegadaInput.addEventListener("change", validarFechas);
  }

  // Mostrar / ocultar vales
  var checkVales = document.getElementById("valesCombustible");
  var contVales = document.getElementById("camposVales");
  function toggleVales() {
    if (!checkVales || !contVales) return;
    if (checkVales.checked) {
      contVales.style.display = "grid";
      if (cantidadValeEl2) cantidadValeEl2.disabled = false;
      if (valorValeEl) valorValeEl.disabled = false;
      if (totalValeEl2) totalValeEl2.disabled = false;
    } else {
      contVales.style.display = "none";
      if (cantidadValeEl2) {
        cantidadValeEl2.value = "";
        cantidadValeEl2.disabled = true;
      }
      if (valorValeEl) {
        valorValeEl.value = "";
        valorValeEl.disabled = true;
      }
      if (totalValeEl2) {
        totalValeEl2.value = "0,00";
        totalValeEl2.disabled = true;
      }
      calcularTotales();
    }
  }
  if (checkVales && contVales) {
    checkVales.addEventListener("change", toggleVales);
    toggleVales();
  }

  // Ajuste inicial de filas según cantidad de viajantes
  actualizarCamposViajantes();

  // Ajuste inicial de totales
  calcularTotales();

  // Antes de enviar el formulario, mandamos números reales al backend
  var form = document.getElementById("formularioViatico");
  if (form) {
    form.addEventListener("submit", function () {
      var camposNumericos = [];
      document.querySelectorAll(".importe").forEach(function (el) {
        camposNumericos.push(el);
      });
      if (adicionalEl) camposNumericos.push(adicionalEl);
      if (devueltoEl) camposNumericos.push(devueltoEl);
      if (valorValeEl) camposNumericos.push(valorValeEl);
      if (totalValeEl2) camposNumericos.push(totalValeEl2);

      camposNumericos.forEach(function (el) {
        if (!el) return;
        var n = convertirAFloat(el.value);
        el.value = n ? n.toFixed(2) : "0.00";
      });

      calcularTotales();
    });
  }
});
