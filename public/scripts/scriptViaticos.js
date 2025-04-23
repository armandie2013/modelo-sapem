
    // 🔠 Capitalización de campos
    function capitalizarCadaPalabra(texto) {
      return texto.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    }
  
    function capitalizarOracion(texto) {
      const limpio = texto.trim().toLowerCase();
      return limpio.charAt(0).toUpperCase() + limpio.slice(1);
    }
  
    // 🔢 Conversión y formato de números
    function convertirAFloat(valor) {
      return parseFloat(valor.replace(/\./g, '').replace(',', '.')) || 0;
    }
  
    function formatArg(num) {
      return num.toLocaleString('es-AR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    }
  
    // 💲 Preparar campos para ingreso de importe
    function prepararCampoImporte(input) {
      input.addEventListener('keydown', function (e) {
        if (e.key === '.') {
          e.preventDefault();
          const cursor = this.selectionStart;
          const before = this.value.slice(0, cursor);
          const after = this.value.slice(cursor);
          this.value = before + ',' + after;
          this.setSelectionRange(cursor + 1, cursor + 1);
        }
      });
  
      input.addEventListener('blur', function () {
        const valor = convertirAFloat(this.value);
        this.value = formatArg(valor);
      });
  
      input.addEventListener('input', function () {
        this.value = this.value.replace(/[^0-9.,]/g, '');
      });
    }
  
    // 🧮 Cálculo de totales
    function calcularTotales() {
      const importes = document.querySelectorAll('.importe');
      let totalViatico = 0;
  
      importes.forEach(input => {
        totalViatico += convertirAFloat(input.value);
      });
  
      const adicionalEfectivo = convertirAFloat(document.getElementById('adicionalEnEfectivo').value);
      const devolucionEfectivo = convertirAFloat(document.getElementById('devolucionEnEfectivo').value);
      const pendienteDeRendicion = Math.max(adicionalEfectivo - devolucionEfectivo, 0);
  
      const cantidadVales = parseInt(document.getElementById('cantidadVale').value) || 0;
      const valorPorVale = convertirAFloat(document.getElementById('valorVale').value);
      const totalVales = cantidadVales * valorPorVale;
      document.getElementById('totalVale').value = formatArg(totalVales);
  
      const totalARecibir = totalViatico + adicionalEfectivo;
      document.getElementById('totalViatico').textContent = formatArg(totalViatico);
      document.getElementById('pendienteDeRendicion').value = formatArg(pendienteDeRendicion);
      document.getElementById('totalARecibir').value = formatArg(totalARecibir);
  
      document.getElementById('montoTotalViaticoHidden').value = totalViatico.toFixed(2);
      document.getElementById('pendienteDeRendicionHidden').value = pendienteDeRendicion.toFixed(2);
    }
  
    // 🚀 Inicio de eventos al cargar la página
    document.addEventListener("DOMContentLoaded", () => {
      // 📝 Aplicar capitalización
      const camposMayusculas = ['areaSolicitante', 'origen', 'destino', 'vehiculoUtilizado'];
      camposMayusculas.forEach(name => {
        const input = document.querySelector(`[name="${name}"]`);
        if (input) {
          input.addEventListener('blur', () => {
            input.value = capitalizarCadaPalabra(input.value);
          });
        }
      });
  
      const campoMotivo = document.querySelector('[name="motivoDelViaje"]');
      if (campoMotivo) {
        campoMotivo.addEventListener('blur', () => {
          campoMotivo.value = capitalizarOracion(campoMotivo.value);
        });
      }
  
      // 💬 Placeholder dinámico
      const placeholderSelectors = [
        '[name="adicionalEnEfectivo"]',
        '[name="devolucionEnEfectivo"]',
        '[name="valorVale"]',
        '[name="totalVale"]',
        '[name^="importeViatico["]'
      ];
  
      placeholderSelectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(input => {
          const originalPlaceholder = input.placeholder;
          input.dataset.placeholder = originalPlaceholder;
  
          input.addEventListener('focus', () => {
            if (input.value.trim() === originalPlaceholder) {
              input.value = '';
            }
          });
  
          input.addEventListener('blur', () => {
            if (!input.value.trim()) {
              input.value = '';
              input.placeholder = input.dataset.placeholder || originalPlaceholder;
            }
          });
        });
      });
  
      // 🔁 Preparar campos numéricos
      const camposFormatear = [
        ...document.querySelectorAll('.importe'),
        document.getElementById('adicionalEnEfectivo'),
        document.getElementById('devolucionEnEfectivo'),
        document.getElementById('valorVale'),
        document.getElementById('totalVale')
      ];
  
      camposFormatear.forEach(input => {
        if (input) prepararCampoImporte(input);
      });
  
      // 🧾 Recalcular al escribir
      document.querySelectorAll('.importe').forEach(input => {
        input.addEventListener('blur', calcularTotales);
      });
  
      const cantidadValeInput = document.getElementById('cantidadVale');
      if (cantidadValeInput) {
        cantidadValeInput.addEventListener('input', calcularTotales);
      }
  
      calcularTotales();
    });
  
    // 📊 Actualizar totales en tiempo real
    document.addEventListener('input', (e) => {
      if (
        e.target.classList.contains('importe') ||
        ['adicionalEnEfectivo', 'devolucionEnEfectivo', 'valorVale', 'cantidadVale'].includes(e.target.id)
      ) {
        calcularTotales();
      }
    });
  
    // 🧼 Conversión de valores antes del envío
    document.querySelector('form').addEventListener('submit', function () {
      const camposAEnviar = [
        ...document.querySelectorAll('.importe'),
        document.getElementById('adicionalEnEfectivo'),
        document.getElementById('devolucionEnEfectivo'),
        document.getElementById('valorVale'),
        document.getElementById('totalVale')
      ];
  
      camposAEnviar.forEach(input => {
        if (input && input.value) {
          input.value = convertirAFloat(input.value).toFixed(2);
        }
      });
  
      document.getElementById('montoTotalViaticoHidden').value =
        convertirAFloat(document.getElementById('montoTotalViaticoHidden').value).toFixed(2);
  
      document.getElementById('pendienteDeRendicionHidden').value =
        convertirAFloat(document.getElementById('pendienteDeRendicionHidden').value).toFixed(2);
    });
  
    // 👥 Habilitar campos según cantidad de viajantes
    function actualizarCamposViajantes() {
      const cantidad = parseInt(document.getElementById("cantidadDeViajantes").value);
      const selects = document.querySelectorAll(".viajante-select");
      const importes = document.querySelectorAll(".importe");
  
      selects.forEach((select, i) => {
        select.disabled = i >= cantidad;
        select.classList.toggle("bg-gray-100", i >= cantidad);
        if (i >= cantidad) select.value = "";
      });
  
      importes.forEach((input, i) => {
        input.disabled = i >= cantidad;
        input.classList.toggle("bg-gray-100", i >= cantidad);
        if (i >= cantidad) input.value = "";
      });
    }
  
    document.addEventListener("DOMContentLoaded", () => {
      document.getElementById("cantidadDeViajantes").addEventListener("change", actualizarCamposViajantes);
      actualizarCamposViajantes();
    });
  
    // ❌ Evitar selección duplicada de viajantes
    document.addEventListener("DOMContentLoaded", () => {
      document.querySelectorAll('.viajante-select').forEach(select => {
        select.addEventListener('change', function () {
          const selectedValues = Array.from(document.querySelectorAll('.viajante-select'))
            .map(s => s.value).filter(v => v);
          const duplicates = selectedValues.filter((v, i, a) => a.indexOf(v) !== i);
          if (duplicates.length > 0) {
            alert('No se pueden seleccionar viajantes duplicados.');
            this.value = "";
          }
        });
      });
    });
  
    // 🔁 Cargar automáticamente el cargo al seleccionar una persona
    document.addEventListener("DOMContentLoaded", () => {
      document.querySelectorAll('.viajante-select').forEach(select => {
        select.addEventListener('change', function () {
          const index = this.dataset.index;
          const selected = this.options[this.selectedIndex];
          const cargo = selected.getAttribute('data-cargo') || '';
          document.getElementById(`cargo-${index}`).value = cargo;
        });
      });
    });
  
    // ⛽ Mostrar/ocultar vales de combustible
    document.addEventListener("DOMContentLoaded", () => {
      const checkboxVales = document.getElementById("valesCombustible");
      const camposVales = document.getElementById("camposVales");
      const cantidadVale = document.getElementById("cantidadVale");
      const valorVale = document.getElementById("valorVale");
      const totalVale = document.getElementById("totalVale");
  
      function toggleCamposVales() {
        const habilitar = checkboxVales.checked;
        camposVales.style.display = habilitar ? "grid" : "none";
  
        cantidadVale.disabled = !habilitar;
        valorVale.disabled = !habilitar;
        totalVale.disabled = !habilitar;
        totalVale.classList.toggle("bg-gray-100", !habilitar);
  
        if (!habilitar) {
          cantidadVale.value = "";
          valorVale.value = "";
          totalVale.value = "";
        }
      }
  
      checkboxVales.addEventListener("change", toggleCamposVales);
      toggleCamposVales();
    });
  
  
  
  
  // Llamar a la función principal
  iniciarFormularioViaticos();
  