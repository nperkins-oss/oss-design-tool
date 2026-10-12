/**
 * OSS Design Tool - Project Engineering Multi-Tab Excel Workbook Exporter
 * Generates an architectural Division 27 / Division 28 Excel Workbook (.xls SpreadsheetML)
 * containing 4 detailed, styled worksheets:
 * 1. Bill of Materials (BOM & Procurement Schedule)
 * 2. TIA-606-C Structured Cable Pull Schedule & 2-Line Labels
 * 3. Enterprise Switch Port Matrix & VLAN Allocations
 * 4. Equipment Rack Elevations & Dual A+B Power Schedules
 */

const EngineeringWorkbookExporter = {
  xmlEscape(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  },

  /**
   * Generates the master 4-tab SpreadsheetML XML string
   */
  generateWorkbookXml(customBom = null, customProjName = null) {
    const projName = customProjName || (typeof StorageService !== "undefined" ? StorageService.getActiveProjectName() : "Security & Network Infrastructure");
    const bom = customBom || ((typeof projectBOM !== "undefined" && Array.isArray(projectBOM)) ? projectBOM : []);

    // 1. Gather Data Sources
    const bomSheetXml = this.generateBomWorksheetXml(bom, projName);
    const cableSheetXml = this.generateCableScheduleWorksheetXml();
    const portSheetXml = this.generatePortMatrixWorksheetXml(bom);
    const rackSheetXml = this.generateRackScheduleWorksheetXml(bom);

    // 2. Assemble Master SpreadsheetML XML
    return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
  <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
    <Title>${this.xmlEscape(projName)} - Engineering Submittal Package</Title>
    <Subject>Division 27 / 28 Infrastructure Sizing &amp; Schedules</Subject>
    <Author>Orion Security Solutions, Inc.</Author>
    <Created>${new Date().toISOString()}</Created>
    <Company>Orion Security Solutions</Company>
  </DocumentProperties>
  <Styles>
    <!-- Default Normal Style -->
    <Style ss:ID="Default" ss:Name="Normal">
      <Alignment ss:Vertical="Center"/>
      <Borders/>
      <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#1E293B"/>
    </Style>

    <!-- Project Title Banner -->
    <Style ss:ID="TitleBanner">
      <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="15" ss:Bold="1" ss:Color="#0F172A"/>
      <Interior ss:Color="#F1F5F9" ss:Pattern="Solid"/>
    </Style>

    <!-- Subtitle Meta -->
    <Style ss:ID="MetaSubtitle">
      <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="9.5" ss:Italic="1" ss:Color="#64748B"/>
    </Style>

    <!-- Table Headers -->
    <Style ss:ID="HeaderNavy">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#0F172A"/>
      </Borders>
      <Font ss:FontName="Calibri" ss:Size="10.5" ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#0F172A" ss:Pattern="Solid"/>
    </Style>

    <Style ss:ID="HeaderEmerald">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#064E3B"/>
      </Borders>
      <Font ss:FontName="Calibri" ss:Size="10.5" ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#064E3B" ss:Pattern="Solid"/>
    </Style>

    <Style ss:ID="HeaderIndigo">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#312E81"/>
      </Borders>
      <Font ss:FontName="Calibri" ss:Size="10.5" ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#1E1B4B" ss:Pattern="Solid"/>
    </Style>

    <!-- Data Formats -->
    <Style ss:ID="CellLeft">
      <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
    </Style>
    <Style ss:ID="CellCenter">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
    </Style>
    <Style ss:ID="CellRight">
      <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
    </Style>
    <Style ss:ID="CellCode">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Font ss:FontName="Consolas" ss:Size="9.5" ss:Color="#0F172A"/>
    </Style>
    <Style ss:ID="CellCurrency">
      <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
      <NumberFormat ss:Format="&quot;$&quot;#,##0.00"/>
    </Style>
    <Style ss:ID="CellInteger">
      <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
      <NumberFormat ss:Format="#,##0"/>
    </Style>
    <Style ss:ID="CellDec1">
      <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
      <NumberFormat ss:Format="#,##0.0"/>
    </Style>

    <!-- Total Rows -->
    <Style ss:ID="RowTotal">
      <Borders>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#334155"/>
        <Border ss:Position="Bottom" ss:LineStyle="Double" ss:Weight="3" ss:Color="#0F172A"/>
      </Borders>
      <Font ss:FontName="Calibri" ss:Size="10.5" ss:Bold="1" ss:Color="#0F172A"/>
      <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="RowTotalCurrency">
      <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
      <Borders>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#334155"/>
        <Border ss:Position="Bottom" ss:LineStyle="Double" ss:Weight="3" ss:Color="#0F172A"/>
      </Borders>
      <Font ss:FontName="Calibri" ss:Size="10.5" ss:Bold="1" ss:Color="#0F172A"/>
      <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
      <NumberFormat ss:Format="&quot;$&quot;#,##0.00"/>
    </Style>
  </Styles>
  ${bomSheetXml}
  ${cableSheetXml}
  ${portSheetXml}
  ${rackSheetXml}
</Workbook>`;
  },

  /**
   * Generates and downloads the comprehensive multi-tab engineering workbook
   */
  exportWorkbook() {
    const projName = typeof StorageService !== "undefined" ? StorageService.getActiveProjectName() : "Security & Network Infrastructure";
    const bom = (typeof projectBOM !== "undefined" && Array.isArray(projectBOM)) ? projectBOM : [];
    
    if (bom.length === 0) {
      if (typeof showToast === "function") showToast("Cannot export: Project BOM is empty.");
      return;
    }

    const timestamp = new Date().toISOString().split("T")[0];
    const xml = this.generateWorkbookXml(bom, projName);

    // Trigger Download
    const blob = new Blob([xml], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeName = projName.replace(/[^a-zA-Z0-9_\-]/g, "_");
    link.href = url;
    link.download = `${safeName}_Engineering_Workbook_${timestamp}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    if (typeof showToast === "function") {
      showToast(`Exported 4-Tab Engineering Workbook (.xls) for ${projName}!`);
    }
  },

  /**
   * Tab 1: Bill of Materials Worksheet
   */
  generateBomWorksheetXml(bom, projName) {
    let rowsXml = "";
    let totalMSRP = 0;
    let totalQty = 0;
    let totalWatts = 0;

    bom.forEach((item, idx) => {
      const qty = parseInt(item.quantity, 10) || 1;
      const unitPrice = parseFloat(item.unitMSRP || item.msrp || item.unitPrice || 0);
      const extPrice = qty * unitPrice;
      const watts = (parseFloat(item.poeBudget) || 0) + (parseFloat(item.baseWatts || item.powerWatts) || 0);

      totalMSRP += extPrice;
      totalQty += qty;
      totalWatts += (watts * qty);

      const seq = item.deviceNumber || `ITEM-${String(idx + 1).padStart(2, '0')}`;
      const name = item.friendlyName || item.model || "Hardware";
      const model = item.model || "";
      const sku = item.sku || "";
      const vendor = item.vendor || "Generic";
      const role = item.role || item.category || "General";
      const closet = item.closetName || item.rackId || "Unassigned";
      const slot = item.rackSlot ? `U${item.rackSlot}` : (item.mountingMethod || "Field");
      const powerType = item.poeBudget > 0 ? `PoE Budget (${item.poeBudget}W)` : (item.baseWatts > 0 ? `AC (${item.baseWatts}W)` : "Passive / Edge");

      rowsXml += `
        <Row ss:Height="20">
          <Cell ss:StyleID="CellCode"><Data ss:Type="String">${this.xmlEscape(seq)}</Data></Cell>
          <Cell ss:StyleID="CellLeft"><Data ss:Type="String">${this.xmlEscape(name)}</Data></Cell>
          <Cell ss:StyleID="CellLeft"><Data ss:Type="String">${this.xmlEscape(vendor)}</Data></Cell>
          <Cell ss:StyleID="CellLeft"><Data ss:Type="String">${this.xmlEscape(model)}</Data></Cell>
          <Cell ss:StyleID="CellCode"><Data ss:Type="String">${this.xmlEscape(sku)}</Data></Cell>
          <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${this.xmlEscape(role)}</Data></Cell>
          <Cell ss:StyleID="CellLeft"><Data ss:Type="String">${this.xmlEscape(closet)}</Data></Cell>
          <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${this.xmlEscape(slot)}</Data></Cell>
          <Cell ss:StyleID="CellInteger"><Data ss:Type="Number">${qty}</Data></Cell>
          <Cell ss:StyleID="CellCurrency"><Data ss:Type="Number">${unitPrice.toFixed(2)}</Data></Cell>
          <Cell ss:StyleID="CellCurrency"><Data ss:Type="Number">${extPrice.toFixed(2)}</Data></Cell>
          <Cell ss:StyleID="CellRight"><Data ss:Type="Number">${watts.toFixed(1)}</Data></Cell>
          <Cell ss:StyleID="CellLeft"><Data ss:Type="String">${this.xmlEscape(powerType)}</Data></Cell>
        </Row>
      `;
    });

    return `
  <Worksheet ss:Name="1. Bill of Materials (BOM)">
    <Table ss:DefaultColumnWidth="75" ss:DefaultRowHeight="18">
      <Column ss:Width="70"/>
      <Column ss:Width="160"/>
      <Column ss:Width="95"/>
      <Column ss:Width="175"/>
      <Column ss:Width="110"/>
      <Column ss:Width="90"/>
      <Column ss:Width="125"/>
      <Column ss:Width="65"/>
      <Column ss:Width="50"/>
      <Column ss:Width="85"/>
      <Column ss:Width="95"/>
      <Column ss:Width="75"/>
      <Column ss:Width="130"/>

      <Row ss:Height="28">
        <Cell ss:MergeAcross="12" ss:StyleID="TitleBanner">
          <Data ss:Type="String">  ORION SECURITY SOLUTIONS — BILL OF MATERIALS (BOM)</Data>
        </Cell>
      </Row>
      <Row ss:Height="18">
        <Cell ss:MergeAcross="12" ss:StyleID="MetaSubtitle">
          <Data ss:Type="String">  Project: ${this.xmlEscape(projName)}  |  Generated: ${new Date().toLocaleDateString()}  |  Engineered per Orion Standards</Data>
        </Cell>
      </Row>
      <Row ss:Height="10"/>

      <!-- Table Header -->
      <Row ss:Height="24">
        <Cell ss:StyleID="HeaderNavy"><Data ss:Type="String">Seq ID</Data></Cell>
        <Cell ss:StyleID="HeaderNavy"><Data ss:Type="String">Equipment Description</Data></Cell>
        <Cell ss:StyleID="HeaderNavy"><Data ss:Type="String">Vendor</Data></Cell>
        <Cell ss:StyleID="HeaderNavy"><Data ss:Type="String">Hardware Model</Data></Cell>
        <Cell ss:StyleID="HeaderNavy"><Data ss:Type="String">Catalog SKU</Data></Cell>
        <Cell ss:StyleID="HeaderNavy"><Data ss:Type="String">Role / Domain</Data></Cell>
        <Cell ss:StyleID="HeaderNavy"><Data ss:Type="String">Enclosure / Space</Data></Cell>
        <Cell ss:StyleID="HeaderNavy"><Data ss:Type="String">Slot / U</Data></Cell>
        <Cell ss:StyleID="HeaderNavy"><Data ss:Type="String">Qty</Data></Cell>
        <Cell ss:StyleID="HeaderNavy"><Data ss:Type="String">Unit MSRP</Data></Cell>
        <Cell ss:StyleID="HeaderNavy"><Data ss:Type="String">Ext. MSRP</Data></Cell>
        <Cell ss:StyleID="HeaderNavy"><Data ss:Type="String">Power (W)</Data></Cell>
        <Cell ss:StyleID="HeaderNavy"><Data ss:Type="String">Power Delivery</Data></Cell>
      </Row>

      ${rowsXml}

      <!-- Total Row -->
      <Row ss:Height="24">
        <Cell ss:MergeAcross="7" ss:StyleID="RowTotal"><Data ss:Type="String">TOTALS (Quoted Project Hardware)</Data></Cell>
        <Cell ss:StyleID="RowTotal"><Data ss:Type="Number">${totalQty}</Data></Cell>
        <Cell ss:StyleID="RowTotal"><Data ss:Type="String">—</Data></Cell>
        <Cell ss:StyleID="RowTotalCurrency"><Data ss:Type="Number">${totalMSRP.toFixed(2)}</Data></Cell>
        <Cell ss:StyleID="RowTotal"><Data ss:Type="Number">${totalWatts.toFixed(1)}</Data></Cell>
        <Cell ss:StyleID="RowTotal"><Data ss:Type="String">${Math.round(totalWatts * 3.412)} BTU/hr</Data></Cell>
      </Row>
    </Table>
  </Worksheet>`;
  },

  /**
   * Tab 2: Cable Pull Schedule & Orion 2-Line Labels
   */
  generateCableScheduleWorksheetXml() {
    let rowsXml = "";
    let sched = [];
    if (typeof generateCableScheduleData === "function") {
      try {
        sched = generateCableScheduleData();
      } catch (e) {
        console.warn("[WorkbookExport] Error getting cable schedule:", e);
      }
    }

    let totalFt = 0;

    sched.forEach((row, idx) => {
      const dropFt = parseInt(row.totalFt || row.calculatedTotalFt || 120, 10);
      const slackFt = parseInt(row.slackFt || 15, 10);
      totalFt += dropFt;

      const cableId = row.cableId || `CBL-${String(idx + 1).padStart(3, '0')}`;
      const closet = row.closetName || "MDF • Main Telecom";
      const ppPort = row.patchPanelPort || `PP01-P${String((idx % 24) + 1).padStart(2, '0')}`;
      const dropName = row.deviceName || row.name || `Drop #${idx + 1}`;
      const floor = row.floorName || "Floor 1";
      const subsystem = row.subsystem || row.role || "Video Surveillance";
      const spec = row.cableSku || "C6A-CMP-1K-BL (Cat6A Plenum)";
      const drcStatus = dropFt > 328 ? "CRITICAL VIOLATION (>328')" : (dropFt > 295 ? "CAUTION (>295')" : "TIA-568 PASS (<295')");

      // Orion 2-Line Label Standard
      const line1Switch = `FROM: ${closet} / ${ppPort}`;
      const line2Switch = `TO: ${dropName} (${floor})`;
      const line1Device = `ID: ${cableId} • ${subsystem}`;
      const line2Device = `FED: ${closet} • ${ppPort}`;

      rowsXml += `
        <Row ss:Height="20">
          <Cell ss:StyleID="CellCode"><Data ss:Type="String">${this.xmlEscape(cableId)}</Data></Cell>
          <Cell ss:StyleID="CellLeft"><Data ss:Type="String">${this.xmlEscape(closet)}</Data></Cell>
          <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${this.xmlEscape(ppPort)}</Data></Cell>
          <Cell ss:StyleID="CellLeft"><Data ss:Type="String">${this.xmlEscape(dropName)}</Data></Cell>
          <Cell ss:StyleID="CellLeft"><Data ss:Type="String">${this.xmlEscape(floor)}</Data></Cell>
          <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${this.xmlEscape(subsystem)}</Data></Cell>
          <Cell ss:StyleID="CellLeft"><Data ss:Type="String">${this.xmlEscape(spec)}</Data></Cell>
          <Cell ss:StyleID="CellInteger"><Data ss:Type="Number">${dropFt}</Data></Cell>
          <Cell ss:StyleID="CellInteger"><Data ss:Type="Number">${slackFt}</Data></Cell>
          <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${this.xmlEscape(drcStatus)}</Data></Cell>
          <Cell ss:StyleID="CellLeft"><Data ss:Type="String">${this.xmlEscape(line1Switch)} | ${this.xmlEscape(line2Switch)}</Data></Cell>
          <Cell ss:StyleID="CellLeft"><Data ss:Type="String">${this.xmlEscape(line1Device)} | ${this.xmlEscape(line2Device)}</Data></Cell>
        </Row>
      `;
    });

    return `
  <Worksheet ss:Name="2. Cable Schedule &amp; Labels">
    <Table ss:DefaultColumnWidth="75" ss:DefaultRowHeight="18">
      <Column ss:Width="85"/>
      <Column ss:Width="130"/>
      <Column ss:Width="80"/>
      <Column ss:Width="140"/>
      <Column ss:Width="80"/>
      <Column ss:Width="110"/>
      <Column ss:Width="150"/>
      <Column ss:Width="65"/>
      <Column ss:Width="60"/>
      <Column ss:Width="140"/>
      <Column ss:Width="180"/>
      <Column ss:Width="180"/>

      <Row ss:Height="28">
        <Cell ss:MergeAcross="11" ss:StyleID="TitleBanner">
          <Data ss:Type="String">  ORION SECURITY SOLUTIONS — TIA-606-C CABLE SCHEDULE &amp; PULL RUNS</Data>
        </Cell>
      </Row>
      <Row ss:Height="18">
        <Cell ss:MergeAcross="11" ss:StyleID="MetaSubtitle">
          <Data ss:Type="String">  T568-B Termination Standard  |  Max 295ft Horizontal + 33ft Patch  |  Orion 2-Line Heat Shrink Labels</Data>
        </Cell>
      </Row>
      <Row ss:Height="10"/>

      <!-- Table Header -->
      <Row ss:Height="24">
        <Cell ss:StyleID="HeaderEmerald"><Data ss:Type="String">Cable Tag ID</Data></Cell>
        <Cell ss:StyleID="HeaderEmerald"><Data ss:Type="String">Source Enclosure</Data></Cell>
        <Cell ss:StyleID="HeaderEmerald"><Data ss:Type="String">Patch Port</Data></Cell>
        <Cell ss:StyleID="HeaderEmerald"><Data ss:Type="String">Field Device Drop</Data></Cell>
        <Cell ss:StyleID="HeaderEmerald"><Data ss:Type="String">Floor / Zone</Data></Cell>
        <Cell ss:StyleID="HeaderEmerald"><Data ss:Type="String">Subsystem</Data></Cell>
        <Cell ss:StyleID="HeaderEmerald"><Data ss:Type="String">Cable Specification</Data></Cell>
        <Cell ss:StyleID="HeaderEmerald"><Data ss:Type="String">Length (ft)</Data></Cell>
        <Cell ss:StyleID="HeaderEmerald"><Data ss:Type="String">Slack (ft)</Data></Cell>
        <Cell ss:StyleID="HeaderEmerald"><Data ss:Type="String">TIA-568 Status</Data></Cell>
        <Cell ss:StyleID="HeaderEmerald"><Data ss:Type="String">Switch End Label Text</Data></Cell>
        <Cell ss:StyleID="HeaderEmerald"><Data ss:Type="String">Device End Label Text</Data></Cell>
      </Row>

      ${rowsXml}

      <!-- Total Row -->
      <Row ss:Height="24">
        <Cell ss:MergeAcross="6" ss:StyleID="RowTotal"><Data ss:Type="String">TOTAL CABLING REQUIREMENTS (${sched.length} Total Field Pulls)</Data></Cell>
        <Cell ss:StyleID="RowTotal"><Data ss:Type="Number">${totalFt}</Data></Cell>
        <Cell ss:StyleID="RowTotal"><Data ss:Type="String">${Math.ceil(totalFt / 1000)} Spools</Data></Cell>
        <Cell ss:MergeAcross="2" ss:StyleID="RowTotal"><Data ss:Type="String">1,000 ft Reelex Spool Calculation</Data></Cell>
      </Row>
    </Table>
  </Worksheet>`;
  },

  /**
   * Tab 3: Switch Port Matrix & VLAN Schedule
   */
  generatePortMatrixWorksheetXml(bom) {
    let rowsXml = "";
    const switches = bom.filter(i => {
      const role = (i.role || "").toLowerCase();
      return role === "access" || role === "core" || role === "aggregation" || (i.category || "").toLowerCase().includes("switch") || (i.model || "").toLowerCase().includes("switch");
    });

    let portCounter = 0;
    switches.forEach((sw, sIdx) => {
      const portsCount = parseInt(sw.ports || sw.rj45Ports || 24, 10);
      const swName = sw.friendlyName || sw.model || `SW-${sIdx + 1}`;
      const closet = sw.closetName || sw.rackId || "MDF";
      const uSlot = sw.rackSlot ? `U${sw.rackSlot}` : "U10";

      for (let p = 1; p <= portsCount; p++) {
        portCounter++;
        let vlan = 10;
        let vlanName = "Corporate Data";
        let role = "Access Port";
        let poeAlloc = 0;
        let connectedDrop = "Spare Available";

        if (p <= 12) {
          vlan = 30;
          vlanName = "Surveillance (CCTV)";
          role = "IP Security Camera";
          poeAlloc = 15.4;
          connectedDrop = `CAM-${String(p).padStart(2, '0')}`;
        } else if (p <= 16) {
          vlan = 40;
          vlanName = "Access Control (EAC)";
          role = "Card Reader Door Controller";
          poeAlloc = 25.5;
          connectedDrop = `DR-CTRL-${String(p - 12).padStart(2, '0')}`;
        } else if (p <= 20) {
          vlan = 50;
          vlanName = "Wireless (WLAN)";
          role = "Wi-Fi 6 Access Point";
          poeAlloc = 30.0;
          connectedDrop = `AP-${String(p - 16).padStart(2, '0')}`;
        }

        rowsXml += `
          <Row ss:Height="19">
            <Cell ss:StyleID="CellLeft"><Data ss:Type="String">${this.xmlEscape(swName)}</Data></Cell>
            <Cell ss:StyleID="CellLeft"><Data ss:Type="String">${this.xmlEscape(closet)} (${uSlot})</Data></Cell>
            <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${this.xmlEscape(sw.sku || sw.model)}</Data></Cell>
            <Cell ss:StyleID="CellCode"><Data ss:Type="String">GigE 1/0/${p}</Data></Cell>
            <Cell ss:StyleID="CellCenter"><Data ss:Type="String">1 Gbps</Data></Cell>
            <Cell ss:StyleID="CellInteger"><Data ss:Type="Number">${vlan}</Data></Cell>
            <Cell ss:StyleID="CellLeft"><Data ss:Type="String">${this.xmlEscape(vlanName)}</Data></Cell>
            <Cell ss:StyleID="CellLeft"><Data ss:Type="String">${this.xmlEscape(connectedDrop)}</Data></Cell>
            <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${this.xmlEscape(role)}</Data></Cell>
            <Cell ss:StyleID="CellRight"><Data ss:Type="Number">${poeAlloc.toFixed(1)}</Data></Cell>
          </Row>
        `;
      }
    });

    return `
  <Worksheet ss:Name="3. Switch Port Matrix">
    <Table ss:DefaultColumnWidth="75" ss:DefaultRowHeight="18">
      <Column ss:Width="140"/>
      <Column ss:Width="110"/>
      <Column ss:Width="140"/>
      <Column ss:Width="85"/>
      <Column ss:Width="75"/>
      <Column ss:Width="60"/>
      <Column ss:Width="120"/>
      <Column ss:Width="140"/>
      <Column ss:Width="140"/>
      <Column ss:Width="80"/>

      <Row ss:Height="28">
        <Cell ss:MergeAcross="9" ss:StyleID="TitleBanner">
          <Data ss:Type="String">  ORION SECURITY SOLUTIONS — SWITCH PORT MATRIX &amp; VLAN MAPPING</Data>
        </Cell>
      </Row>
      <Row ss:Height="18">
        <Cell ss:MergeAcross="9" ss:StyleID="MetaSubtitle">
          <Data ss:Type="String">  802.1Q VLAN Segregation  |  802.3af/at/bt PoE Allocations  |  Switch Interfaces</Data>
        </Cell>
      </Row>
      <Row ss:Height="10"/>

      <!-- Table Header -->
      <Row ss:Height="24">
        <Cell ss:StyleID="HeaderIndigo"><Data ss:Type="String">Switch Device Name</Data></Cell>
        <Cell ss:StyleID="HeaderIndigo"><Data ss:Type="String">Closet / Rack Slot</Data></Cell>
        <Cell ss:StyleID="HeaderIndigo"><Data ss:Type="String">Hardware SKU</Data></Cell>
        <Cell ss:StyleID="HeaderIndigo"><Data ss:Type="String">Physical Port</Data></Cell>
        <Cell ss:StyleID="HeaderIndigo"><Data ss:Type="String">Link Speed</Data></Cell>
        <Cell ss:StyleID="HeaderIndigo"><Data ss:Type="String">VLAN ID</Data></Cell>
        <Cell ss:StyleID="HeaderIndigo"><Data ss:Type="String">Network Segment</Data></Cell>
        <Cell ss:StyleID="HeaderIndigo"><Data ss:Type="String">Connected Field Drop</Data></Cell>
        <Cell ss:StyleID="HeaderIndigo"><Data ss:Type="String">Endpoint Role</Data></Cell>
        <Cell ss:StyleID="HeaderIndigo"><Data ss:Type="String">PoE Alloc (W)</Data></Cell>
      </Row>

      ${rowsXml}
    </Table>
  </Worksheet>`;
  },

  /**
   * Tab 4: Rack Elevation & Dual A+B Power Schedules
   */
  generateRackScheduleWorksheetXml(bom) {
    let rowsXml = "";
    const mountedItems = bom.filter(i => i.rackSlot || i.closetName || i.rackId);

    mountedItems.forEach(item => {
      const name = item.friendlyName || item.model || "Rack Device";
      const closet = item.closetName || item.rackId || "MDF • Main Telecom";
      const uSlot = item.rackSlot ? `U${item.rackSlot}` : "Shelf";
      const ruHeight = item.rackUnits || 1;
      const baseW = parseFloat(item.baseWatts || item.powerWatts || 40);
      const poeW = parseFloat(item.poeBudget || 0);
      const btu = Math.round((baseW + poeW) * 3.412);
      
      const psuCount = item.psuCount || (baseW > 100 ? 2 : 1);
      const feedA = (item.pduFeedA || (psuCount >= 2 ? "PDU-A (Primary AC)" : "PDU-A"));
      const feedB = (psuCount >= 2 ? (item.pduFeedB || "PDU-B (Redundant AC)") : "N/A (Single Cord)");
      const redundancyStatus = psuCount >= 2 ? "A+B Redundant" : "Single Point of Failure (SPOF)";

      rowsXml += `
        <Row ss:Height="20">
          <Cell ss:StyleID="CellLeft"><Data ss:Type="String">${this.xmlEscape(closet)}</Data></Cell>
          <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${this.xmlEscape(uSlot)}</Data></Cell>
          <Cell ss:StyleID="CellCenter"><Data ss:Type="Number">${ruHeight}</Data></Cell>
          <Cell ss:StyleID="CellLeft"><Data ss:Type="String">${this.xmlEscape(name)}</Data></Cell>
          <Cell ss:StyleID="CellCode"><Data ss:Type="String">${this.xmlEscape(item.sku || item.model)}</Data></Cell>
          <Cell ss:StyleID="CellRight"><Data ss:Type="Number">${baseW.toFixed(1)}</Data></Cell>
          <Cell ss:StyleID="CellRight"><Data ss:Type="Number">${poeW.toFixed(1)}</Data></Cell>
          <Cell ss:StyleID="CellInteger"><Data ss:Type="Number">${btu}</Data></Cell>
          <Cell ss:StyleID="CellLeft"><Data ss:Type="String">${this.xmlEscape(feedA)}</Data></Cell>
          <Cell ss:StyleID="CellLeft"><Data ss:Type="String">${this.xmlEscape(feedB)}</Data></Cell>
          <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${this.xmlEscape(redundancyStatus)}</Data></Cell>
        </Row>
      `;
    });

    return `
  <Worksheet ss:Name="4. Rack &amp; Power Elevation">
    <Table ss:DefaultColumnWidth="75" ss:DefaultRowHeight="18">
      <Column ss:Width="140"/>
      <Column ss:Width="65"/>
      <Column ss:Width="50"/>
      <Column ss:Width="160"/>
      <Column ss:Width="130"/>
      <Column ss:Width="75"/>
      <Column ss:Width="75"/>
      <Column ss:Width="80"/>
      <Column ss:Width="130"/>
      <Column ss:Width="130"/>
      <Column ss:Width="140"/>

      <Row ss:Height="28">
        <Cell ss:MergeAcross="10" ss:StyleID="TitleBanner">
          <Data ss:Type="String">  ORION SECURITY SOLUTIONS — RACK ELEVATION &amp; DUAL A+B POWER SCHEDULE</Data>
        </Cell>
      </Row>
      <Row ss:Height="18">
        <Cell ss:MergeAcross="10" ss:StyleID="MetaSubtitle">
          <Data ss:Type="String">  EIA-310-D 19\" Rails  |  Dual A+B Branch Circuits  |  Thermal Dissipation BTU/hr</Data>
        </Cell>
      </Row>
      <Row ss:Height="10"/>

      <!-- Table Header -->
      <Row ss:Height="24">
        <Cell ss:StyleID="HeaderNavy"><Data ss:Type="String">Telecom Enclosure</Data></Cell>
        <Cell ss:StyleID="HeaderNavy"><Data ss:Type="String">U-Slot</Data></Cell>
        <Cell ss:StyleID="HeaderNavy"><Data ss:Type="String">RU</Data></Cell>
        <Cell ss:StyleID="HeaderNavy"><Data ss:Type="String">Mounted Hardware Description</Data></Cell>
        <Cell ss:StyleID="HeaderNavy"><Data ss:Type="String">Manufacturer SKU</Data></Cell>
        <Cell ss:StyleID="HeaderNavy"><Data ss:Type="String">Base (W)</Data></Cell>
        <Cell ss:StyleID="HeaderNavy"><Data ss:Type="String">PoE (W)</Data></Cell>
        <Cell ss:StyleID="HeaderNavy"><Data ss:Type="String">Heat (BTU/hr)</Data></Cell>
        <Cell ss:StyleID="HeaderNavy"><Data ss:Type="String">Primary AC (Feed A)</Data></Cell>
        <Cell ss:StyleID="HeaderNavy"><Data ss:Type="String">Secondary AC (Feed B)</Data></Cell>
        <Cell ss:StyleID="HeaderNavy"><Data ss:Type="String">Power Redundancy</Data></Cell>
      </Row>

      ${rowsXml}
    </Table>
  </Worksheet>`;
  }
};

window.EngineeringWorkbookExporter = EngineeringWorkbookExporter;
window.exportProjectEngineeringWorkbook = () => EngineeringWorkbookExporter.exportWorkbook();
