document.addEventListener("DOMContentLoaded", () => {
  // --- DOM Elements ---
  const fileTabsNav = document.getElementById("file-tabs-nav");
  const fileTabsContent = document.getElementById("file-tabs-content");
  const loadingMessage = document.getElementById("loading-message");
  const showDATCheckbox = document.getElementById("dat");
  const showTableCheckbox = document.getElementById("table-togle");
  let showDAT = true;
  let isDATCalculated = false;

  showTableCheckbox.addEventListener("change", (event) => {
    showTable = event.target.checked;
    console.log(document.querySelector(".file-tabs-content"));
    if (showTable) {
      document.querySelector("#file-tabs-content").classList.remove("hidden");
    } else {
      document.querySelector("#file-tabs-content").classList.add("hidden");
    }

    console.log(showTable);
  });
  showDATCheckbox.addEventListener("change", (event) => {
    showDAT = event.target.checked;
    // If DAT checkbox is toggled, re-render the current chart with the updated setting
    if (myChart) {
      const activeFileIndex = parseInt(
        document.querySelector("#file-tabs-nav .active").dataset.fileIndex
      );
      const activeSheetIndex = parseInt(
        document.querySelector(
          "#file-tabs-content .tab-content[data-file-index='" +
            activeFileIndex +
            "'] .sheet-tab-button.active"
        ).dataset.sheetIndex
      );

      const fileData = parsedWorkbooks[activeFileIndex];
      const sheetDataStored = fileData.sheetsData[activeSheetIndex];

      if (sheetDataStored && sheetDataStored.chartLabels.length > 0) {
        createColumnSumChart(
          {
            labels: sheetDataStored.chartLabels,
            values: sheetDataStored.chartValues,
          },
          {
            rawData: sheetDataStored.rawData,
            headers: sheetDataStored.headers,
          }
        );
      }
    }
  });

  // --- Dialog Elements ---
  const breakdownDialog = document.getElementById("breakdownDialog");
  const breakdownDialogTitle = document.getElementById("breakdownDialogTitle");
  const breakdownDialogContent = document.getElementById(
    "breakdownDialogContent"
  );
  const closeBreakdownDialogButton = document.getElementById(
    "closeBreakdownDialog"
  );

  // --- Chart Elements ---
  const mainChartArea = document.getElementById("mainChartArea");
  const mainChartCanvas = document.getElementById("mainChartCanvas");
  const noChartDataMessage = document.getElementById("noChartDataMessage");

  // --- Configuration (Your Excel Files) ---
  const excelFilesToLoad = [
    "https://mostafaezzatt.github.io/egair-meal-status/Data/Forign_By_meal.xlsx",
    "https://mostafaezzatt.github.io/egair-meal-status/Data/Total.xlsx",
    // "/Data/Forign_By_meal.xlsx",
    // "/Data/Total.xlsx",
    // Add more Excel file paths as needed.
  ];

  // --- Global Data Store ---
  const parsedWorkbooks = [];

  // --- Global Chart Instance ---
  let myChart = null;
  // Store current sheet's original data for breakdown dialog (updated by createColumnSumChart)
  let currentOriginalSheetData = { rawData: [], headers: [] };

  // --- UI Logic Functions ---

  /**
   * Activates a specific file tab and its first sheet tab.
   * @param {number} fileIndex - The index of the file to activate.
   */
  function activateFileTab(fileIndex) {
    // Deactivate all file tabs
    document
      .querySelectorAll("#file-tabs-nav .tab-button")
      .forEach((btn) => btn.classList.remove("active"));
    // Hide all file content areas
    document
      .querySelectorAll("#file-tabs-content .tab-content")
      .forEach((content) => content.classList.add("hidden"));

    // Activate the selected file tab button
    const selectedButton = fileTabsNav.querySelector(
      `.tab-button[data-file-index="${fileIndex}"]`
    );
    if (selectedButton) {
      selectedButton.classList.add("active");
    }

    // Show the selected file content area
    const selectedContent = fileTabsContent.querySelector(
      `.tab-content[data-file-index="${fileIndex}"]`
    );
    if (selectedContent) {
      selectedContent.classList.remove("hidden");
      // Activate the first sheet tab within the selected file content
      const firstSheetTabButton = selectedContent.querySelector(
        ".sheet-tabs-nav .sheet-tab-button"
      );
      if (firstSheetTabButton) {
        activateSheetTab(
          selectedContent,
          firstSheetTabButton.dataset.sheetIndex
        );
      } else {
        // If no sheets, hide the chart area
        mainChartArea.classList.add("hidden");
      }
    }
  }

  /**
   * Activates a specific sheet tab within a file and updates the chart.
   * @param {HTMLElement} fileContentDiv - The div containing the sheet tabs and content for the current file.
   * @param {string} sheetIndex - The index of the sheet to activate.
   */
  function activateSheetTab(fileContentDiv, sheetIndex) {
    // Deactivate all sheet tabs within the current file
    fileContentDiv
      .querySelectorAll(".sheet-tabs-nav .sheet-tab-button")
      .forEach((btn) => btn.classList.remove("active"));
    // Hide all sheet content areas within the current file
    fileContentDiv
      .querySelectorAll(".sheet-tabs-content .sheet-tab-content")
      .forEach((content) => content.classList.add("hidden"));

    // Activate the selected sheet tab button
    const selectedButton = fileContentDiv.querySelector(
      `.sheet-tabs-nav .sheet-tab-button[data-sheet-index="${sheetIndex}"]`
    );
    if (selectedButton) {
      selectedButton.classList.add("active");
    }

    // Show the selected sheet content area
    const selectedContent = fileContentDiv.querySelector(
      `.sheet-tabs-content .sheet-tab-content[data-sheet-index="${sheetIndex}"]`
    );
    if (selectedContent) {
      selectedContent.classList.remove("hidden");

      // Retrieve stored chart data and raw data for the activated sheet
      const fileIndex = parseInt(fileContentDiv.dataset.fileIndex);
      const fileData = parsedWorkbooks[fileIndex];

      if (fileData && !fileData.error && fileData.sheetsData[sheetIndex]) {
        const sheetDataStored = fileData.sheetsData[sheetIndex];
        if (sheetDataStored.chartLabels.length > 0) {
          // If chart data exists, create/update the chart
          createColumnSumChart(
            {
              labels: sheetDataStored.chartLabels,
              values: sheetDataStored.chartValues,
            },
            {
              rawData: sheetDataStored.rawData,
              headers: sheetDataStored.headers,
            }
          );
        } else {
          // If no chart data, show the "no chart" message and hide the canvas
          mainChartArea.classList.remove("hidden");
          mainChartCanvas.classList.add("hidden");
          noChartDataMessage.classList.remove("hidden");
        }
      } else {
        // If file data or sheet data is missing/errored, hide the entire chart area
        mainChartArea.classList.add("hidden");
      }
    }
  }

  // --- Custom Chart.js Tooltip Positioner (unchanged) ---
  Chart.Tooltip.positioners.mouse = function (items, eventPosition) {
    return {
      x: eventPosition.x,
      y: eventPosition.y,
    };
  };

  /**
   * Initializes or updates the single bar chart for column sums using Chart.js.
   * This function manages the single `myChart` instance.
   * @param {Object} chartData - An object containing labels (column names) and values (column sums).
   * @param {Object} originalSheetData - Contains original rawData and headers for detailed breakdown.
   */
  function createColumnSumChart(chartData, originalSheetData) {
    // Update global variables that openBreakdownDialog will use
    currentOriginalSheetData = originalSheetData;

    // Ensure the chart area and canvas are visible, and the no-data message is hidden
    mainChartArea.classList.remove("hidden");
    mainChartCanvas.classList.remove("hidden");
    noChartDataMessage.classList.add("hidden");

    const findDAT = originalSheetData.rawData.find((row) => row[0] === "dat");
    if (findDAT && !showDAT) {
      findDAT.forEach((row, idx) => {
        if (idx > 0 && !isDATCalculated) {
          const deepCopyChartData = { ...chartData };
          deepCopyChartData.values[idx - 1] -= row;
          chartData = deepCopyChartData;
          isDATCalculated = true;
        }
      });
    } else {
      if (findDAT) {
        findDAT.forEach((row, idx) => {
          if (idx > 0 && isDATCalculated) {
            const deepCopyChartData = { ...chartData };
            deepCopyChartData.values[idx - 1] += row;
            chartData = deepCopyChartData;
            isDATCalculated = false;
          }
        });
      }
    }

    if (myChart) {
      // If chart instance already exists, update its data and refresh
      myChart.data.labels = chartData.labels;
      myChart.data.datasets[0].data = chartData.values;
      myChart.update();
    } else {
      // If this is the first time, create the chart instance
      const ctx = mainChartCanvas.getContext("2d");
      myChart = new Chart(ctx, {
        type: "bar",
        data: {
          labels: chartData.labels,
          datasets: [
            {
              label: "Column Sum",
              data: chartData.values,
              backgroundColor: "rgba(75, 192, 192, 0.6)",
              borderColor: "rgba(75, 192, 192, 1)",
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: "Total Sum",
                color: "#e2e8f0", // Light text for dark mode
              },
              ticks: {
                color: "#a0aec0", // Lighter text for ticks
              },
              grid: {
                color: "#4a5568", // Darker grid lines
              },
            },
            x: {
              title: {
                display: true,
                text: "Column",
                color: "#e2e8f0",
              },
              ticks: {
                color: "#a0aec0",
              },
              grid: {
                color: "#4a5568",
              },
            },
          },
          plugins: {
            legend: {
              display: false,
            },
            title: {
              display: true,
              text: "Total Sum of Numeric Columns",
              color: "#f7fafc", // White text for title
            },
            tooltip: {
              enabled: true,
              mode: "index",
              intersect: false,
              position: "mouse",
              backgroundColor: "rgba(0, 0, 0, 0.7)",
              titleColor: "#e2e8f0",
              bodyColor: "#e2e8f0",
              borderColor: "#4a5568",
              borderWidth: 1,
              cornerRadius: 4,
              displayColors: false,
              padding: 10,
              callbacks: {
                title: (tooltipItems) => {
                  return tooltipItems[0].label;
                },
                label: (tooltipItem) => {
                  return `Sum: ${tooltipItem.raw.toLocaleString()}`;
                },
              },
            },
          },
          onClick: (event, elements, chart) => {
            if (elements.length > 0) {
              const dataIndex = elements[0].index;
              const clickedColumnName = chart.data.labels[dataIndex];

              // Use the globally stored original sheet data for breakdown
              const originalColumnIndex =
                currentOriginalSheetData.headers.indexOf(clickedColumnName);

              if (originalColumnIndex !== -1) {
                openBreakdownDialog(
                  currentOriginalSheetData.rawData,
                  originalColumnIndex,
                  clickedColumnName
                );
              }
            }
          },
        },
      });
    }
  }

  // --- Functions to manage the breakdown dialog (unchanged, uses currentOriginalSheetData) ---
  function openBreakdownDialog(rawData, originalColumnIndex, columnName) {
    breakdownDialogTitle.textContent = `Breakdown for: ${columnName}`;
    breakdownDialogContent.innerHTML = "";

    let numericCount = 0;
    let nonNumericCount = 0;
    let sum = 0;
    const nonZeroValuesWithLabels = [];

    const dataRows = rawData.slice(1);

    dataRows.forEach((row, rowIndex) => {
      if (row[0] == "dat" && !showDAT) return;
      const rowLabel =
        row[0] !== undefined && row[0] !== null
          ? String(row[0]).toUpperCase()
          : `ROW ${rowIndex + 1}`;
      const value = row[originalColumnIndex];

      let isNumeric = false;
      let numValue = null;

      if (typeof value === "number" && !isNaN(value)) {
        numValue = value;
        isNumeric = true;
      } else if (typeof value === "string" && value.trim() !== "") {
        const parsed = parseFloat(value);
        if (!isNaN(parsed)) {
          numValue = parsed;
          isNumeric = true;
        }
      }
      console.log(row);
      if (isNumeric) {
        if (numValue !== 0) {
          numericCount++;
          sum += numValue;
          nonZeroValuesWithLabels.push({ label: rowLabel, value: numValue });
        }
      } else {
        if (value !== "" && value !== null && typeof value !== "undefined") {
          nonNumericCount++;
          nonZeroValuesWithLabels.push({ label: rowLabel, value: value });
        }
      }
    });

    const summaryDiv = document.createElement("div");
    summaryDiv.className = "mb-4 p-3 bg-gray-700 rounded";
    summaryDiv.innerHTML = `
            <p class="text-sm"><strong>Total Non-Zero Entries:</strong> ${
              nonZeroValuesWithLabels.length
            }</p>
            <p class="text-sm"><strong>Non-Zero Numeric Values:</strong> ${numericCount}</p>
            <p class="text-sm"><strong>Total Sum (Non-Zero):</strong> ${sum.toLocaleString()}</p>
            `;
    // <p class="text-sm"><strong>Non-Numeric Entries:</strong> ${nonNumericCount}</p>
    breakdownDialogContent.appendChild(summaryDiv);

    if (nonZeroValuesWithLabels.length > 0) {
      // MODIFIED: Create a div for grid layout
      const gridContainer = document.createElement("div");
      gridContainer.className =
        "grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-gray-200 text-sm max-h-60 overflow-y-auto pr-2"; // Tailwind grid classes

      // Add header row for the grid
      const headerLabel = document.createElement("div");
      headerLabel.className = "font-bold border-b border-gray-600 pb-1";
      headerLabel.textContent = "Row Label";
      gridContainer.appendChild(headerLabel);

      const headerValue = document.createElement("div");
      headerValue.className = "font-bold border-b border-gray-600 pb-1";
      headerValue.textContent = "Value";
      gridContainer.appendChild(headerValue);

      // nonZeroValuesWithLabels.slice(0, 50).forEach((item) => {
      nonZeroValuesWithLabels.forEach((item) => {
        // Create div for label
        const labelDiv = document.createElement("div");
        labelDiv.className = "text-right pr-2"; // Align label to right
        labelDiv.textContent = item.label + ":"; // Add colon for separation
        gridContainer.appendChild(labelDiv);

        // Create div for value
        const valueDiv = document.createElement("div");
        const displayValue =
          typeof item.value === "number"
            ? item.value.toLocaleString()
            : String(item.value);
        valueDiv.textContent = displayValue;
        gridContainer.appendChild(valueDiv);
      });

      // if (nonZeroValuesWithLabels.length > 50) {
      //   const ellipsisDiv = document.createElement("div");
      //   ellipsisDiv.className = "col-span-2 text-center text-gray-400 pt-2"; // Span both columns
      //   ellipsisDiv.textContent = `...and ${
      //     nonZeroValuesWithLabels.length - 50
      //   } more non-zero entries.`;
      //   gridContainer.appendChild(ellipsisDiv);
      // }
      breakdownDialogContent.appendChild(gridContainer); // Append the grid container
    } else {
      const noValuesMessage = document.createElement("p");
      noValuesMessage.className = "text-center text-gray-400 text-sm mt-4";
      noValuesMessage.textContent = "No non-zero entries found in this column.";
      breakdownDialogContent.appendChild(noValuesMessage);
    }

    breakdownDialog.classList.remove("hidden");
  }

  function closeBreakdownDialog() {
    breakdownDialog.classList.add("hidden");
  }

  // --- Event Listeners for the Dialog ---
  closeBreakdownDialogButton.addEventListener("click", closeBreakdownDialog);
  breakdownDialog.addEventListener("click", (event) => {
    if (event.target === breakdownDialog) {
      closeBreakdownDialog();
    }
  });

  // --- Data Processing Functions ---

  async function processExcelFile(filePath) {
    let fileName = filePath.split("/").pop();
    try {
      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const fileContent = await response.arrayBuffer();
      const workbook = XLSX.read(fileContent, { type: "array" });
      return { fileName, workbook, error: null };
    } catch (error) {
      console.error(`Error loading or parsing ${fileName}:`, error);
      return { fileName, workbook: null, error: error.message };
    }
  }

  /**
   * Builds the main tabbed UI for files and sheets, and stores processed data.
   */
  function buildTabbedUI() {
    if (parsedWorkbooks.length === 0) {
      loadingMessage.textContent = "No Excel files to display.";
      mainChartArea.classList.add("hidden"); // Hide chart area if no files
      return;
    }

    loadingMessage.style.display = "none";

    parsedWorkbooks.forEach((fileData, fileIndex) => {
      const { fileName, workbook, error } = fileData;

      const fileTabButton = document.createElement("button");
      fileTabButton.className = "tab-button";
      fileTabButton.textContent = fileName
        .replace(/[_-]/g, " ")
        .replace(".xlsx", "");
      fileTabButton.dataset.fileIndex = fileIndex;
      fileTabButton.addEventListener("click", () => activateFileTab(fileIndex));
      fileTabsNav.appendChild(fileTabButton);

      const fileContentDiv = document.createElement("div");
      fileContentDiv.className = "tab-content hidden";
      fileContentDiv.dataset.fileIndex = fileIndex;
      fileTabsContent.appendChild(fileContentDiv);

      if (error) {
        fileContentDiv.innerHTML = `
                    <div class="error-message">
                        <h2 class="text-lg font-bold">Error loading "${fileName}"</h2>
                        <p>Details: ${error}</p>
                        <p>Please ensure the file exists at <code>${excelFilesToLoad[fileIndex]}</code> and is a valid Excel file.</p>
                    </div>
                `;
        return;
      }

      const sheetTabsNav = document.createElement("div");
      sheetTabsNav.className =
        "sheet-tabs-nav flex flex-wrap gap-1 mb-2 border-b border-gray-600";
      fileContentDiv.appendChild(sheetTabsNav);

      const sheetTabsContent = document.createElement("div");
      sheetTabsContent.className = "sheet-tabs-content";
      fileContentDiv.appendChild(sheetTabsContent);

      if (workbook.SheetNames.length === 0) {
        sheetTabsContent.innerHTML = `<p class="text-gray-400 p-4">No sheets found in "${fileName}".</p>`;
        return;
      }

      // Initialize a structure to hold sheet-specific processed data
      fileData.sheetsData = [];

      workbook.SheetNames.forEach((sheetName, sheetIndex) => {
        const worksheet = workbook.Sheets[sheetName];

        const rawData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          raw: true,
        });
        let headers = [];
        let dataRows = [];

        if (rawData.length > 0) {
          headers = rawData[0];
          dataRows = rawData.slice(1);
        }

        const columnInfo = {};

        headers.forEach((header, colIdx) => {
          let sum = 0;
          let hasNumericData = false;
          dataRows.forEach((row) => {
            const value = row[colIdx];
            if (typeof value === "number" && !isNaN(value)) {
              sum += value;
              hasNumericData = true;
            } else if (
              typeof value === "string" &&
              value.trim() !== "" &&
              !isNaN(parseFloat(value))
            ) {
              sum += parseFloat(value);
              hasNumericData = true;
            }
          });
          columnInfo[header] = { sum: sum, hasNumeric: hasNumericData };
        });

        // Determine which columns to display in the table (currently all that have data)
        const columnsToKeepForTable = headers.filter((header) => {
          const info = columnInfo[header];
          // Keep if no info (implies non-numeric or empty column without specific sum)
          // or if it has numeric data and a non-zero sum, or if it's explicitly non-numeric
          return (
            !info || (info.hasNumeric && info.sum !== 0) || !info.hasNumeric
          );
        });

        const filteredRawDataForTable = [];
        if (headers.length > 0) {
          filteredRawDataForTable.push(columnsToKeepForTable); // Add filtered headers
          dataRows.forEach((originalRow) => {
            const newRow = [];
            columnsToKeepForTable.forEach((colName) => {
              const colIdx = headers.indexOf(colName);
              newRow.push(originalRow[colIdx]);
            });
            filteredRawDataForTable.push(newRow);
          });
        }

        const filteredWorksheet = XLSX.utils.aoa_to_sheet(
          filteredRawDataForTable
        );

        const chartLabels = [];
        const chartValues = [];
        headers.forEach((header) => {
          const info = columnInfo[header];
          if (info && info.hasNumeric && info.sum !== 0) {
            chartLabels.push(header);
            chartValues.push(info.sum);
          }
        });

        // Store all relevant data for this sheet for later retrieval by activateSheetTab
        fileData.sheetsData[sheetIndex] = {
          rawData: rawData, // Full raw data for breakdown dialog
          headers: headers, // Full headers for breakdown dialog
          chartLabels: chartLabels, // Labels for chart
          chartValues: chartValues, // Values for chart
        };

        // Create the sheet tab button
        const sheetTabButton = document.createElement("button");
        sheetTabButton.className = "sheet-tab-button";
        sheetTabButton.textContent = sheetName;
        sheetTabButton.dataset.sheetIndex = sheetIndex;
        sheetTabButton.addEventListener("click", () =>
          activateSheetTab(fileContentDiv, sheetIndex)
        );
        sheetTabsNav.appendChild(sheetTabButton);

        // Create the sheet content div (for the table)
        const sheetContentDiv = document.createElement("div");
        sheetContentDiv.className = "sheet-tab-content hidden";
        sheetContentDiv.dataset.sheetIndex = sheetIndex;
        sheetTabsContent.appendChild(sheetContentDiv);

        const data = XLSX.utils.sheet_to_json(filteredWorksheet, { header: 1 }); // 2D array

        // Modify the first column (column A)
        for (let i = 0; i < data.length; i++) {
          data[i][0] = data[i][0].toUpperCase(); // You can do any transformation here
        }

        const newSheet = XLSX.utils.json_to_sheet(data);

        // Generate and insert the HTML table
        const htmlTable = XLSX.utils.sheet_to_html(newSheet, {
          id: `table-${fileName.replace(/\./g, "-")}-${sheetName.replace(
            /[^a-zA-Z0-9]/g,
            ""
          )}`,
          raw: true,
        });

        // const htmlTable = XLSX.utils.sheet_to_html(filteredWorksheet, {
        //   id: `table-${fileName.replace(/\./g, "-")}-${sheetName.replace(
        //     /[^a-zA-Z0-9]/g,
        //     ""
        //   )}`,
        //   raw: true,
        // });

        sheetContentDiv.innerHTML = `<div class="table-container tb-toggler">${htmlTable}</div>`;
        sheetContentDiv.querySelector("tr").remove();

        // Note: Dynamic chart creation for each sheet is removed from here.
        // The single mainChartCanvas will be updated by activateSheetTab.
      });
    });

    // After all UI is built, activate the first file tab,
    // which will in turn activate its first sheet tab and trigger the chart rendering.
    if (parsedWorkbooks.length > 0) {
      activateFileTab(0);
    }
  }

  /**
   * Initializes the application by loading Excel files and building the UI.
   */
  async function init() {
    loadingMessage.textContent = "Loading Excel files...";
    const promises = excelFilesToLoad.map((filePath) =>
      processExcelFile(filePath)
    );
    const results = await Promise.all(promises);
    parsedWorkbooks.push(...results);

    buildTabbedUI();
  }

  // Start the application initialization
  init();
});
