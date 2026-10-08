// Master Hardware Asset Registry (Photos, Renderings, and Datasheets)
// Unified mapping for NetSelect Enterprise

const CATALOG_ASSETS = {
  "AF60-HD": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/Ubiquiti airFiber 60 HD - Tech Specs.pdf",
    "image": "assets/images/products/ubnt-af60-hd.webp"
  },
  "AF60-XR": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/Ubiquiti airFiber 60 XR - Tech Specs.pdf",
    "image": "assets/images/products/ubnt-af60-xr.webp"
  },
  "AMG140-1GR": {
    "datasheetPath": "Datasheets/Network/AMG/AMG140-1GR Series Datasheet D37287-01.pdf",
    "image": "assets/images/products/amg-140-1gr.webp"
  },
  "AMG150-1GAT-P30": {
    "datasheetPath": "Datasheets/Network/AMG/AMG150 1 Port Series Datasheet D33646-05.pdf",
    "image": "assets/images/products/amg-150-1gat-p30.webp"
  },
  "AMG150-1GBT-P90": {
    "datasheetPath": "Datasheets/Network/AMG/AMG150 1 Port Series Datasheet D33646-05.pdf",
    "image": "assets/images/products/amg-150-1gat-p30.webp"
  },
  "AMG150-1GBT-P90-LV": {
    "datasheetPath": "Datasheets/Network/AMG/AMG150 1 Port LV Series Datasheet D33647-04.pdf",
    "image": "assets/images/products/amg-150-1gbt-p90-lv.webp"
  },
  "AMG150-1XBT-P90": {
    "datasheetPath": "Datasheets/Network/AMG/AMG150 1 Port Series Datasheet D33646-05.pdf",
    "image": "assets/images/products/amg-150-1gat-p30.webp"
  },
  "AMG150-2GBT-P180": {
    "datasheetPath": "Datasheets/Network/AMG/AMG150 2 Port Series Datasheet D33051-08.pdf",
    "image": "assets/images/products/amg-150-2gbt-p180.webp"
  },
  "AMG150-4GAT-P120": {
    "datasheetPath": "Datasheets/Network/AMG/AMG150 4_6 Port Series Datasheet D33393-03.pdf",
    "image": "assets/images/products/amg-150-4gat-p120.webp"
  },
  "AMG150-8GAT-P240": {
    "datasheetPath": "Datasheets/Network/AMG/AMG150 8 Port Series Datasheet D33619-03.pdf",
    "image": "assets/images/products/amg-150-8gat-p240.webp"
  },
  "AMG155-1GAT-P30": {
    "datasheetPath": "Datasheets/Network/AMG/AMG155 1 Port Series Datasheet D33648-08.pdf",
    "image": "assets/images/products/amg-155-1gat-p30.webp"
  },
  "AMG156-1GBT-P90": {
    "datasheetPath": "Datasheets/Network/AMG/AMG156 8_16_24 Series Datasheet D33394-03.pdf",
    "image": "assets/images/products/amg-156-1gbt-p90.webp"
  },
  "AMG160-1F-1EC": {
    "datasheetPath": "Datasheets/Network/AMG/AMG160-1F-1EC Datasheet D37139-04.pdf",
    "image": "assets/images/products/amg-160-1f-1ec.webp"
  },
  "AMG172-1G-1V": {
    "datasheetPath": "Datasheets/Network/AMG/AMG172 Series Datasheet D39111-10.pdf",
    "image": "assets/images/products/amg-172-1g-1v.webp"
  },
  "AMG2015": {
    "datasheetPath": "Datasheets/Network/AMG/AMG250R Series Datasheet D33036-07.pdf",
    "image": "assets/images/products/amg-2015.webp"
  },
  "AMG2015-DR": {
    "datasheetPath": "Datasheets/Network/AMG/AMG2015-DR 3U Rack Datasheet D18966-02.pdf",
    "image": "assets/images/products/amg-2015-dr.webp"
  },
  "AMG2031": {
    "datasheetPath": "Datasheets/Network/AMG/AMG2031 1U Rack Datasheet D33276-01.pdf",
    "image": "assets/images/products/amg-2031.webp"
  },
  "AMG2035": {
    "datasheetPath": "Datasheets/Network/AMG/AMG2035 90 Degree Bracket Datasheet D39283-01.pdf",
    "image": "assets/images/products/amg-2035.webp"
  },
  "AMG2036-RP-AA": {
    "datasheetPath": "Datasheets/Network/AMG/AMG2036 Blade Chassis Datasheet D33818-03.pdf",
    "image": "assets/images/products/amg-2036-rp-aa.webp"
  },
  "AMG210M-1G-1S": {
    "datasheetPath": "Datasheets/Network/AMG/AMG210C Media Converter Rack Datasheet D39120-07.pdf",
    "image": "assets/images/products/amg-210m-1g-1s.webp"
  },
  "AMG250-1G-1S": {
    "datasheetPath": "Datasheets/Network/AMG/AMG250 Series Datasheet D33031-08.pdf",
    "image": "assets/images/products/amg-250-1g-1s.webp"
  },
  "AMG250-1GAT-1S-P30": {
    "datasheetPath": "Datasheets/Network/AMG/AMG250 Series Datasheet D33031-08.pdf",
    "image": "assets/images/products/amg-250-1g-1s.webp"
  },
  "AMG250-1GBT-1S-P90": {
    "datasheetPath": "Datasheets/Network/AMG/AMG250 Series Datasheet D33031-08.pdf",
    "image": "assets/images/products/amg-250-1g-1s.webp"
  },
  "AMG250-1XBT-1XS-P90": {
    "datasheetPath": "Datasheets/Network/AMG/AMG250 10G Series Datasheet D33797-01.pdf",
    "image": "assets/images/products/amg-250-1xbt-1xs.webp"
  },
  "AMG250-2G-1S": {
    "datasheetPath": "Datasheets/Network/AMG/AMG250 Series Datasheet D33031-08.pdf",
    "image": "assets/images/products/amg-250-2g-1s.webp"
  },
  "AMG250-2G-2S": {
    "datasheetPath": "Datasheets/Network/AMG/AMG250 Series Datasheet D33031-08.pdf",
    "image": "assets/images/products/amg-250-2g-2s.webp"
  },
  "AMG250R-1G-1S": {
    "datasheetPath": "Datasheets/Network/AMG/AMG250R Series Datasheet D33036-07.pdf",
    "image": "assets/images/products/amg-250r-1g-1s.webp"
  },
  "AMG250R-4G-4S": {
    "datasheetPath": "Datasheets/Network/AMG/AMG250R Series Datasheet D33036-07.pdf",
    "image": "assets/images/products/amg-250r-1g-1s.webp"
  },
  "AMG255-2GBT-1S-P120": {
    "datasheetPath": "Datasheets/Network/AMG/AMG255 120W Series Datasheet D33467-03.pdf",
    "image": "assets/images/products/amg-255-2gbt-1s.webp"
  },
  "AMG260M-1G-1S": {
    "datasheetPath": "Datasheets/Network/AMG/AMG210C Media Converter Rack Datasheet D39120-07.pdf",
    "image": "assets/images/products/amg-210m-1g-1s.webp"
  },
  "AMG260M-1GBT-1S-P90": {
    "datasheetPath": "Datasheets/Network/AMG/AMG210C Media Converter Rack Datasheet D39120-07.pdf",
    "image": "assets/images/products/amg-210m-1g-1s.webp"
  },
  "AMG265M-1G-1S": {
    "datasheetPath": "Datasheets/Network/AMG/AMG210C Media Converter Rack Datasheet D39120-07.pdf",
    "image": "assets/images/products/amg-210m-1g-1s.webp"
  },
  "AMG350-14GAT-2S-P300": {
    "datasheetPath": "Datasheets/Network/AMG/AMG350-14GAT-2S-P300 Datasheet D33751-02.pdf",
    "image": "assets/images/products/amg-350-14gat-2s.webp"
  },
  "AMG350-2G-2S": {
    "datasheetPath": "Datasheets/Network/AMG/AMG350-2G-2S Series Datasheet D33052-08.pdf",
    "image": "assets/images/products/amg-350-2g-2s.webp"
  },
  "AMG350-2GAT-2S-P60": {
    "datasheetPath": "Datasheets/Network/AMG/AMG350-2G-2S Series Datasheet D33052-08.pdf",
    "image": "assets/images/products/amg-350-2g-2s.webp"
  },
  "AMG350-2GBT-2S-P180": {
    "datasheetPath": "Datasheets/Network/AMG/AMG350-2G-2S Series Datasheet D33052-08.pdf",
    "image": "assets/images/products/amg-350-2g-2s.webp"
  },
  "AMG350-4G-1C-1S": {
    "datasheetPath": "Datasheets/Network/AMG/AMG350-4G-1C-1S Series Datasheet D33397-03.pdf",
    "image": "assets/images/products/amg-350-4g-1c-1s.webp"
  },
  "AMG350-4GAT-1C-1S-P120": {
    "datasheetPath": "Datasheets/Network/AMG/AMG350-4G-1C-1S Series Datasheet D33397-03.pdf",
    "image": "assets/images/products/amg-350-4g-1c-1s.webp"
  },
  "AMG350-4GAT-1G-P75-PD": {
    "datasheetPath": "Datasheets/Network/AMG/AMG350-4GAT-1G-P75-PD Datasheet D33641-01.pdf",
    "image": "assets/images/products/amg-350-4gat-1g-pd.webp"
  },
  "AMG350-4GBT-1C-1S-P240": {
    "datasheetPath": "Datasheets/Network/AMG/AMG350-4G-1C-1S Series Datasheet D33397-03.pdf",
    "image": "assets/images/products/amg-350-4g-1c-1s.webp"
  },
  "AMG350-5G": {
    "datasheetPath": "Datasheets/Network/AMG/AMG350-5G Series Datasheet D33403-03.pdf",
    "image": "assets/images/products/amg-350-5g.webp"
  },
  "AMG350-8G": {
    "datasheetPath": "Datasheets/Network/AMG/AMG350-8G Series Datasheet D33404-01.pdf",
    "image": "assets/images/products/amg-350-8g.webp"
  },
  "AMG350-8GAT-2S-P240": {
    "datasheetPath": "Datasheets/Network/AMG/AMG350-8G Series Datasheet D33404-01.pdf",
    "image": "assets/images/products/amg-350-8g.webp"
  },
  "AMG350-8GAT-P200": {
    "datasheetPath": "Datasheets/Network/AMG/AMG350-8G Series Datasheet D33404-01.pdf",
    "image": "assets/images/products/amg-350-8g.webp"
  },
  "AMG510-16GAT-2C-P290": {
    "datasheetPath": "Datasheets/Network/AMG/AMG510-16G Series Datasheet D39131-06.pdf",
    "image": "assets/images/products/amg-510-16gat-2c.webp"
  },
  "AMG510-22GAT-2CAT-2S-P460": {
    "datasheetPath": "Datasheets/Network/AMG/AMG510-24G RP Series Datasheet D39150-05.pdf",
    "image": "assets/images/products/amg-510-24g-4xs.webp"
  },
  "AMG510-24G-4XS": {
    "datasheetPath": "Datasheets/Network/AMG/AMG510-24G RP Series Datasheet D39150-05.pdf",
    "image": "assets/images/products/amg-510-24g-4xs.webp"
  },
  "AMG510-24GAT-4XS-P460": {
    "datasheetPath": "Datasheets/Network/AMG/AMG510-24G RP Series Datasheet D39150-05.pdf",
    "image": "assets/images/products/amg-510-24g-4xs.webp"
  },
  "AMG510-24GAT-4XS-RP540": {
    "datasheetPath": "Datasheets/Network/AMG/AMG510-24G RP Series Datasheet D39150-05.pdf",
    "image": "assets/images/products/amg-510-24g-4xs.webp"
  },
  "AMG510-48GAT-4XS-P860": {
    "datasheetPath": "Datasheets/Network/AMG/AMG510-48G Series Datasheet D39133-06.pdf",
    "image": "assets/images/products/amg-510-48gat-4xs.webp"
  },
  "AMG510-4G-24S-4XS": {
    "datasheetPath": "Datasheets/Network/AMG/AMG510-24G RP Series Datasheet D39150-05.pdf",
    "image": "assets/images/products/amg-510-24g-4xs.webp"
  },
  "AMG510-8G-2S": {
    "datasheetPath": "Datasheets/Network/AMG/AMG510-8G Series Datasheet D39130-03.pdf",
    "image": "assets/images/products/amg-510-8g-2s.webp"
  },
  "AMG510-8GAT-2S-P210": {
    "datasheetPath": "Datasheets/Network/AMG/AMG510-8G Series Datasheet D39130-03.pdf",
    "image": "assets/images/products/amg-510-8g-2s.webp"
  },
  "AMG510-8GBT-16GAT-4XS-P460": {
    "datasheetPath": "Datasheets/Network/AMG/AMG510-16G Series Datasheet D39131-06.pdf",
    "image": "assets/images/products/amg-510-16gat-2c.webp"
  },
  "AMG560-24GAT-4S-RP300-AD": {
    "datasheetPath": "Datasheets/Network/AMG/AMG560-24G Series Datasheet D39136-01.pdf",
    "image": "assets/images/products/amg-560-24gat-4xs.webp"
  },
  "AMG560-24GAT-4XS-P300": {
    "datasheetPath": "Datasheets/Network/AMG/AMG560-24G Series Datasheet D39136-01.pdf",
    "image": "assets/images/products/amg-560-24gat-4xs.webp"
  },
  "AMG560-8G-12S": {
    "datasheetPath": "Datasheets/Network/AMG/AMG560-8G Series Datasheet D39245-04.pdf",
    "image": "assets/images/products/amg-560-8g-4s.webp"
  },
  "AMG560-8G-4S": {
    "datasheetPath": "Datasheets/Network/AMG/AMG560-8G Series Datasheet D39245-04.pdf",
    "image": "assets/images/products/amg-560-8g-4s.webp"
  },
  "AMG560-8G-8S-4XS": {
    "datasheetPath": "Datasheets/Network/AMG/AMG560-8G Series Datasheet D39245-04.pdf",
    "image": "assets/images/products/amg-560-8g-4s.webp"
  },
  "AMG560-8GAT-4S-P240": {
    "datasheetPath": "Datasheets/Network/AMG/AMG560-8G Series Datasheet D39245-04.pdf",
    "image": "assets/images/products/amg-560-8g-4s.webp"
  },
  "AMG560-8GAT-4XS-P240": {
    "datasheetPath": "Datasheets/Network/AMG/AMG560-8G Series Datasheet D39245-04.pdf",
    "image": "assets/images/products/amg-560-8g-4s.webp"
  },
  "AMG570-12GAT-4S-P360": {
    "datasheetPath": "Datasheets/Network/AMG/AMG570 12-16 Port Series Datasheet D36352-05.pdf",
    "image": "assets/images/products/amg-570-8gat-4s.webp"
  },
  "AMG570-16GAT-8S-P360": {
    "datasheetPath": "Datasheets/Network/AMG/AMG570 16-24 Port Series Datasheet D36353-06.pdf",
    "image": "assets/images/products/amg-570-16gat-8s.webp"
  },
  "AMG570-2GBT-10GAT-4S-P360": {
    "datasheetPath": "Datasheets/Network/AMG/AMG570 6 Port Series Datasheet D36098-13.pdf",
    "image": "assets/images/products/amg-570-4g-2s.webp"
  },
  "AMG570-2GBT-2GAT-2S-P240": {
    "datasheetPath": "Datasheets/Network/AMG/AMG570 6 Port Series Datasheet D36098-13.pdf",
    "image": "assets/images/products/amg-570-4g-2s.webp"
  },
  "AMG570-2GBT-4GAT-2G-3S-P300": {
    "datasheetPath": "Datasheets/Network/AMG/AMG570 6 Port Series Datasheet D36098-13.pdf",
    "image": "assets/images/products/amg-570-4g-2s.webp"
  },
  "AMG570-4G-2S": {
    "datasheetPath": "Datasheets/Network/AMG/AMG570 6 Port Series Datasheet D36098-13.pdf",
    "image": "assets/images/products/amg-570-4g-2s.webp"
  },
  "AMG570-4GAT-2S-P120": {
    "datasheetPath": "Datasheets/Network/AMG/AMG570 6 Port Series Datasheet D36098-13.pdf",
    "image": "assets/images/products/amg-570-4g-2s.webp"
  },
  "AMG570-4GAT-2S-P120-K": {
    "datasheetPath": "Datasheets/Network/AMG/AMG570-4G-2S-K Series Datasheet D36307-03.pdf",
    "image": "assets/images/products/amg-570-4g-2s.webp"
  },
  "AMG570-4GBT-4G-3S-P360": {
    "datasheetPath": "Datasheets/Network/AMG/AMG570 6 Port Series Datasheet D36098-13.pdf",
    "image": "assets/images/products/amg-570-4g-2s.webp"
  },
  "AMG570-4GBT-8GAT-4G-8S-P360": {
    "datasheetPath": "Datasheets/Network/AMG/AMG570 11 Port Series Datasheet D36097-16.pdf",
    "image": "assets/images/products/amg-570-8g-3s.webp"
  },
  "AMG570-8G-3S": {
    "datasheetPath": "Datasheets/Network/AMG/AMG570 11 Port Series Datasheet D36097-16.pdf",
    "image": "assets/images/products/amg-570-8g-3s.webp"
  },
  "AMG570-8GAT-3S-P240": {
    "datasheetPath": "Datasheets/Network/AMG/AMG570 11 Port Series Datasheet D36097-16.pdf",
    "image": "assets/images/products/amg-570-8g-3s.webp"
  },
  "AMG570-8GAT-3S-P240-K": {
    "datasheetPath": "Datasheets/Network/AMG/AMG570-8G-3S-K Series Datasheet D36306-03.pdf",
    "image": "assets/images/products/amg-570-8g-3s.webp"
  },
  "AMG570-8GAT-3S-P240-LV": {
    "datasheetPath": "Datasheets/Network/AMG/AMG570 11 Port LV Series Datasheet D36304-06.pdf",
    "image": "assets/images/products/amg-570-8gat-3s-lv.webp"
  },
  "AMG570-8GAT-4S-P240": {
    "datasheetPath": "Datasheets/Network/AMG/AMG570 12-16 Port Series Datasheet D36352-05.pdf",
    "image": "assets/images/products/amg-570-8gat-4s.webp"
  },
  "AMG570-8GBT-4S-P720": {
    "datasheetPath": "Datasheets/Network/AMG/AMG570 12-16 Port Series Datasheet D36352-05.pdf",
    "image": "assets/images/products/amg-570-8gat-4s.webp"
  },
  "AMG7111-1S-1C": {
    "datasheetPath": "Datasheets/Network/AMG/AMG140-1GR Series Datasheet D37287-01.pdf",
    "image": "assets/images/products/amg-350-4g-1c-1s.webp"
  },
  "AMG750-1G-4GAT-104-P120": {
    "datasheetPath": "Datasheets/Network/AMG/AMG750 Series Datasheet D39110-10.pdf",
    "image": "assets/images/products/amg-eoc-7501.webp"
  },
  "AMG7501-1C-1E": {
    "datasheetPath": "Datasheets/Network/AMG/AMG750 Series Datasheet D39110-10.pdf",
    "image": "assets/images/products/amg-eoc-7501.webp"
  },
  "AMG816-1F-RP-AD": {
    "datasheetPath": "Datasheets/Network/AMG/AMG816 Series Datasheet D35161-02.pdf",
    "image": "assets/images/products/amg-816-1f-rp-ad.webp"
  },
  "AMG840-6N-4XS-RP": {
    "datasheetPath": "Datasheets/Network/AMG/AMG840 Series Datasheet D35264-01.pdf",
    "image": "assets/images/products/amg-840-6n-4xs.webp"
  },
  "AMG8870F-03-90": {
    "datasheetPath": "Datasheets/Network/AMG/AMG8870F-03-90 Datasheet D26091-02.pdf",
    "image": "assets/images/products/amg-8870f-03-90.webp"
  },
  "AMG8870F-06": {
    "datasheetPath": "Datasheets/Network/AMG/AMG8870F-06 Datasheet D26090-04.pdf",
    "image": "assets/images/products/amg-8870f-06.webp"
  },
  "AMG8870F-M-E": {
    "datasheetPath": "Datasheets/Network/AMG/AMG8870F-M-E Datasheet D26089-03.pdf",
    "image": "assets/images/products/amg-8870f-m-e.webp"
  },
  "AMG8870F-WALL": {
    "datasheetPath": "Datasheets/Network/AMG/AMG8870F-WALL Datasheet D26093-00.pdf",
    "image": null
  },
  "AMGANT-W1-ODA9": {
    "datasheetPath": "Datasheets/Network/AMG/AMGANT-W1-ODA9 Series Datasheet D39334-00.pdf",
    "image": null
  },
  "AMGMNT-MAG-04": {
    "datasheetPath": "Datasheets/Network/AMG/AMGMNT-MAG Series Datasheet D39361-00.pdf",
    "image": "assets/images/products/amg-mnt-mag-04.webp"
  },
  "AMGPSU-T24-P24": {
    "datasheetPath": "Datasheets/Network/AMG/AMG8870F-06 Datasheet D26090-04.pdf",
    "image": null
  },
  "AR3100": {
    "datasheetPath": null,
    "image": null
  },
  "AT-AR2050V-10": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-ar4050s-5g-ds.pdf",
    "image": "assets/images/products/at-ar2050v-10.webp"
  },
  "AT-AR3050S-10": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-ar4050s-5g-ds.pdf",
    "image": "assets/images/products/at-ar2050v-10.webp"
  },
  "AT-AR4050S-10": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-ar4050s-5g-ds.pdf",
    "image": "assets/images/products/at-ar2050v-10.webp"
  },
  "AT-AR4050S-5G-10": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-ar4050s-5g-ds.pdf",
    "image": "assets/images/products/at-ar2050v-10.webp"
  },
  "AT-GS980EM/10H": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-gs980em-series-ds.pdf",
    "image": "assets/images/products/at-gs980em-10h.webp"
  },
  "AT-GS980EM/11PT": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-gs980em-series-ds.pdf",
    "image": "assets/images/products/at-gs980em-10h.webp"
  },
  "AT-GS980MX/10HSm": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-g980mx-series-ds.pdf",
    "image": "assets/images/products/at-x530l-10ghxm.webp"
  },
  "AT-GS980MX/18HSm": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-g980mx-series-ds.pdf",
    "image": "assets/images/products/at-x530l-10ghxm.webp"
  },
  "AT-GS980MX/28PSm": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-g980mx-series-ds.pdf",
    "image": "assets/images/products/at-x530-28gpx.webp"
  },
  "AT-GS980MX/52PSm": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-g980mx-series-ds.pdf",
    "image": "assets/images/products/at-x530-52gpx.webp"
  },
  "AT-IE220-10GHX": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-ie220-series-ds.pdf",
    "image": "assets/images/products/at-ie220-10ghx.webp"
  },
  "AT-IE220-6GHX": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-ie220-series-ds.pdf",
    "image": "assets/images/products/at-ie220-6ghx.webp"
  },
  "AT-IE340-12GP": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-ie340series-ds.pdf",
    "image": "assets/images/products/at-ie340-12gp.webp"
  },
  "AT-IE340-12GT": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-ie340series-ds.pdf",
    "image": "assets/images/products/at-ie340-12gp.webp"
  },
  "AT-IE340-18GP": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-ie340series-ds.pdf",
    "image": "assets/images/products/at-ie340-12gp.webp"
  },
  "AT-IE340-20GP": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-ie340series-ds.pdf",
    "image": "assets/images/products/at-ie340-20gp.webp"
  },
  "AT-IE360-12": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-ie340series-ds.pdf",
    "image": "assets/images/products/at-ie360-12.webp"
  },
  "AT-IE560-12GSX": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-ie340series-ds.pdf",
    "image": "assets/images/products/at-ie560-12gsx.webp"
  },
  "AT-x230-10GP": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-x230series-ds.pdf",
    "image": "assets/images/products/at-x230-10gp.webp"
  },
  "AT-x230-10GT": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-x230series-ds.pdf",
    "image": "assets/images/products/at-x230-10gp.webp"
  },
  "AT-x230-18GP": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-x230series-ds.pdf",
    "image": "assets/images/products/at-x230-10gp.webp"
  },
  "AT-x230-18GT": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-x230series-ds.pdf",
    "image": "assets/images/products/at-x230-10gp.webp"
  },
  "AT-x230-28GP": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-x230series-ds.pdf",
    "image": "assets/images/products/at-x230-28gp.webp"
  },
  "AT-x230-28GT": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-x230series-ds.pdf",
    "image": "assets/images/products/at-x230-28gp.webp"
  },
  "AT-x530-28GPX": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-x530series-ds.pdf",
    "image": "assets/images/products/at-x530-28gpx.webp"
  },
  "AT-x530-28GPXm": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-x530series-ds.pdf",
    "image": "assets/images/products/at-x530-28gpx.webp"
  },
  "AT-x530-28GTXm": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-x530series-ds.pdf",
    "image": "assets/images/products/at-x530-28gpx.webp"
  },
  "AT-x530-28SPXx": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-x530series-ds.pdf",
    "image": "assets/images/products/at-x550-18xsq.webp"
  },
  "AT-x530-52GPX": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-x530series-ds.pdf",
    "image": "assets/images/products/at-x530-52gpx.webp"
  },
  "AT-x530-52GPXm": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-x530series-ds.pdf",
    "image": "assets/images/products/at-x530-52gpx.webp"
  },
  "AT-x530-52GTXm": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-x530series-ds.pdf",
    "image": "assets/images/products/at-x530-52gpx.webp"
  },
  "AT-x530DP-28GHXm": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-x530series-ds.pdf",
    "image": "assets/images/products/at-x530-28gpx.webp"
  },
  "AT-x530DP-52GHXm": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-x530series-ds.pdf",
    "image": "assets/images/products/at-x530-52gpx.webp"
  },
  "AT-x530L-10GHXm": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-x530l-series-ds.pdf",
    "image": "assets/images/products/at-x530l-10ghxm.webp"
  },
  "AT-x530L-18GHXm": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-x530l-series-ds.pdf",
    "image": "assets/images/products/at-x530l-10ghxm.webp"
  },
  "AT-x530L-28GPX": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-x530l-series-ds.pdf",
    "image": "assets/images/products/at-x530-28gpx.webp"
  },
  "AT-x530L-28GTX": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-x530l-series-ds.pdf",
    "image": "assets/images/products/at-x530-28gpx.webp"
  },
  "AT-x530L-52GPX": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-x530l-series-ds.pdf",
    "image": "assets/images/products/at-x530-52gpx.webp"
  },
  "AT-x530L-52GTX": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-x530l-series-ds.pdf",
    "image": "assets/images/products/at-x530-52gpx.webp"
  },
  "AT-x550-18XSQ": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-x550series-ds.pdf",
    "image": "assets/images/products/at-x550-18xsq.webp"
  },
  "AT-x560-28YSQ": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-x550series-ds.pdf",
    "image": "assets/images/products/at-x550-18xsq.webp"
  },
  "AT-x930-28GPX": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-x930series-ds.pdf",
    "image": "assets/images/products/at-x930-28gpx.webp"
  },
  "AT-x930-28GSTX": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-x930series-ds.pdf",
    "image": "assets/images/products/at-x930-28gpx.webp"
  },
  "AT-x930-28GTX": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-x930series-ds.pdf",
    "image": "assets/images/products/at-x930-28gpx.webp"
  },
  "AT-x930-52GPX": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-x930series-ds.pdf",
    "image": "assets/images/products/at-x930-52gpx.webp"
  },
  "AT-x930-52GTX": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-x930series-ds.pdf",
    "image": "assets/images/products/at-x930-52gpx.webp"
  },
  "AT-x950-28XSQ": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-x950series-ds.pdf",
    "image": "assets/images/products/at-x950-28xsq.webp"
  },
  "AT-x950-28XTQM": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-x950series-ds.pdf",
    "image": "assets/images/products/at-x950-28xtqm.webp"
  },
  "AT-x950-52XSQ": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-x950series-ds.pdf",
    "image": "assets/images/products/at-x950-52xsq.webp"
  },
  "AT-x950-52XTQM": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-x950series-ds.pdf",
    "image": "assets/images/products/at-x950-52xsq.webp"
  },
  "AT-x980-32CQ": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-x980-series-ds.pdf",
    "image": "assets/images/products/at-x980-32cq.webp"
  },
  "AT-x980-32DQ": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-x980-series-ds.pdf",
    "image": "assets/images/products/at-x980-32cq.webp"
  },
  "AX-LIC-10G-EH8010": {
    "datasheetPath": "Datasheets/Network/Siklu/Siklu EtherHaul 8010FX - Tech Specs.pdf",
    "image": null
  },
  "AX-LIC-2.5G-T280": {
    "datasheetPath": "Datasheets/Network/Siklu/Siklu MultiHaul TG Terminal Unit T280 - Tech Specs.pdf",
    "image": null
  },
  "AX-MK-1FT-B": {
    "datasheetPath": "Datasheets/Network/Siklu/Siklu EtherHaul 8010FX - Tech Specs.pdf",
    "image": null
  },
  "AX-SP-01": {
    "datasheetPath": "Datasheets/Network/Siklu/Siklu EtherHaul 8010FX - Tech Specs.pdf",
    "image": null
  },
  "C000000L065A": {
    "datasheetPath": "Datasheets/Network/Cambium/Cambium ePMP Force 300-25 - Tech Specs.pdf",
    "image": null
  },
  "C050900C201A": {
    "datasheetPath": "Datasheets/Network/Cambium/Cambium ePMP Force 300-25 - Tech Specs.pdf",
    "image": "assets/images/products/cambium-epmp-force300.webp"
  },
  "C060084A001A": {
    "datasheetPath": "Datasheets/Network/Cambium/Cambium cnWave 60 GHz V3000 - Tech Specs.pdf",
    "image": "assets/images/products/cambium-cnwave-v3000.webp"
  },
  "C060084A003A": {
    "datasheetPath": "Datasheets/Network/Cambium/Cambium cnWave 60 GHz V1000 - Tech Specs.pdf",
    "image": "assets/images/products/cambium-cnwave-v1000.webp"
  },
  "C060084A004A": {
    "datasheetPath": "Datasheets/Network/Cambium/Cambium cnWave 60 GHz V5000 - Tech Specs.pdf",
    "image": "assets/images/products/cambium-cnwave-v5000.webp"
  },
  "C9200L-24P-4G-M": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Catalyst 9200L-M Datasheet.pdf",
    "image": "assets/images/products/cisco-c9200l-24p-4g-m.webp"
  },
  "C9200L-24P-4X-M": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Catalyst 9200L-M Datasheet.pdf",
    "image": "assets/images/products/cisco-c9200l-24p-4g-m.webp"
  },
  "C9200L-24PXG-4X-M": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Catalyst 9200L-M Datasheet.pdf",
    "image": "assets/images/products/cisco-c9200l-24p-4g-m.webp"
  },
  "C9200L-48P-4G-M": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Catalyst 9200L-M Datasheet.pdf",
    "image": "assets/images/products/cisco-c9200l-48p-4g-m.webp"
  },
  "C9200L-48P-4X-M": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Catalyst 9200L-M Datasheet.pdf",
    "image": "assets/images/products/cisco-c9200l-48p-4g-m.webp"
  },
  "C9200L-48PXG-4X-M": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Catalyst 9200L-M Datasheet.pdf",
    "image": "assets/images/products/cisco-c9200l-48pxg-4x-m.webp"
  },
  "C9300-24P-M": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Catalyst 9300-M Datasheet.pdf",
    "image": "assets/images/products/cisco-c9300-24p-m.webp"
  },
  "C9300-24S-M": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Catalyst 9300-M Datasheet.pdf",
    "image": "assets/images/products/cisco-c9300-24p-m.webp"
  },
  "C9300-24U-M": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Catalyst 9300-M Datasheet.pdf",
    "image": "assets/images/products/cisco-c9300-24p-m.webp"
  },
  "C9300-24UX-M": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Catalyst 9300-M Datasheet.pdf",
    "image": "assets/images/products/cisco-c9300-24p-m.webp"
  },
  "C9300-48P-M": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Catalyst 9300-M Datasheet.pdf",
    "image": "assets/images/products/cisco-c9300-48p-m.webp"
  },
  "C9300-48S-M": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Catalyst 9300-M Datasheet.pdf",
    "image": "assets/images/products/cisco-c9300-48p-m.webp"
  },
  "C9300-48U-M": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Catalyst 9300-M Datasheet.pdf",
    "image": "assets/images/products/cisco-c9300-48p-m.webp"
  },
  "C9300-48UN-M": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Catalyst 9300-M Datasheet.pdf",
    "image": "assets/images/products/cisco-c9300-48p-m.webp"
  },
  "C9300-48UXM-M": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Catalyst 9300-M Datasheet.pdf",
    "image": "assets/images/products/cisco-c9300-48p-m.webp"
  },
  "C9300L-24P-4X-M": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Catalyst 9300L-M Datasheet.pdf",
    "image": "assets/images/products/cisco-c9300l-24p-4x-m.webp"
  },
  "C9300L-24UXG-4X-M": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Catalyst 9300L-M Datasheet.pdf",
    "image": "assets/images/products/cisco-c9300l-24p-4x-m.webp"
  },
  "C9300L-48P-4X-M": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Catalyst 9300L-M Datasheet.pdf",
    "image": "assets/images/products/cisco-c9300l-48p-4x-m.webp"
  },
  "C9300L-48PF-4X-M": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Catalyst 9300L-M Datasheet.pdf",
    "image": "assets/images/products/cisco-c9300l-48p-4x-m.webp"
  },
  "C9300L-48UXG-4X-M": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Catalyst 9300L-M Datasheet.pdf",
    "image": "assets/images/products/cisco-c9300l-48p-4x-m.webp"
  },
  "C9300LM-24U-4Y-M": {
    "datasheetPath": "Datasheets/Network/Cisco/cisco-meraki_datasheet_ms_family.pdf",
    "image": "assets/images/products/cisco-c9300lm-24u-4y-m.webp"
  },
  "C9300LM-48UX-4Y-M": {
    "datasheetPath": "Datasheets/Network/Cisco/cisco-meraki_datasheet_ms_family.pdf",
    "image": "assets/images/products/cisco-c9300lm-24u-4y-m.webp"
  },
  "C9300X-12Y-M": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Catalyst 9300X-M Datasheet.pdf",
    "image": "assets/images/products/cisco-c9300x-12y-m.webp"
  },
  "C9300X-24HX-M": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Catalyst 9300X-M Datasheet.pdf",
    "image": "assets/images/products/cisco-c9300x-24hx-m.webp"
  },
  "C9300X-24Y-M": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Catalyst 9300X-M Datasheet.pdf",
    "image": "assets/images/products/cisco-c9300x-12y-m.webp"
  },
  "C9300X-48HX-M": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Catalyst 9300X-M Datasheet.pdf",
    "image": "assets/images/products/cisco-c9300x-24hx-m.webp"
  },
  "C9300X-48HXN-M": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Catalyst 9300X-M Datasheet.pdf",
    "image": "assets/images/products/cisco-c9300x-24hx-m.webp"
  },
  "C9300X-48TX-M": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Catalyst 9300X-M Datasheet.pdf",
    "image": "assets/images/products/cisco-c9300x-24hx-m.webp"
  },
  "CAT21HP": {
    "datasheetPath": null,
    "image": null
  },
  "CAT32HPBC200": {
    "datasheetPath": null,
    "image": null
  },
  "CAT64HP": {
    "datasheetPath": null,
    "image": null
  },
  "CF54-300-EZ": {
    "datasheetPath": null,
    "image": null
  },
  "CPI-55053-703": {
    "datasheetPath": null,
    "image": null
  },
  "DWR-18-26": {
    "datasheetPath": null,
    "image": null
  },
  "ECS-24-PoE": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Enterprise Campus 24 PoE - Tech Specs.pdf",
    "image": "assets/images/products/unifi-ecs-24-poe.webp"
  },
  "ECS-24S": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Enterprise Campus 24S - Tech Specs.pdf",
    "image": "assets/images/products/unifi-ecs-24s.webp"
  },
  "ECS-24S-PoE": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Enterprise Campus 24S PoE - Tech Specs.pdf",
    "image": "assets/images/products/unifi-ecs-24s-poe.webp"
  },
  "ECS-48-PoE": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Enterprise Campus 48 PoE - Tech Specs.pdf",
    "image": "assets/images/products/unifi-ecs-48-poe.webp"
  },
  "ECS-48S": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Enterprise Campus 48S - Tech Specs.pdf",
    "image": "assets/images/products/unifi-ecs-48s.webp"
  },
  "ECS-48S-PoE": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Enterprise Campus 48S PoE - Tech Specs.pdf",
    "image": "assets/images/products/unifi-ecs-48s-poe.webp"
  },
  "ECS-Aggregation": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Enterprise Campus Aggregation - Tech Specs.pdf",
    "image": "assets/images/products/unifi-ecs-agg.webp"
  },
  "ECS-Core": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Enterprise Campus Switch Core - Tech Specs.pdf",
    "image": "assets/images/products/unifi-ecs-core.webp"
  },
  "EF-Core": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Enterprise Firewall Core - Tech Specs.pdf",
    "image": "assets/images/products/ef-core.webp"
  },
  "EFG": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Enterprise Firewall - Tech Specs.pdf",
    "image": "assets/images/products/efg.webp"
  },
  "EH-1200FX-ODU-L-EXT": {
    "datasheetPath": "Datasheets/Network/Siklu/Siklu EtherHaul 1200FX - Tech Specs.pdf",
    "image": "assets/images/products/siklu-eh-1200fx.webp"
  },
  "EH-8010FX-ODU-H-EXT": {
    "datasheetPath": "Datasheets/Network/Siklu/Siklu EtherHaul 8010FX - Tech Specs.pdf",
    "image": "assets/images/products/siklu-eh-8010fx.webp"
  },
  "EH-ANT-1FT-80GHz": {
    "datasheetPath": "Datasheets/Network/Siklu/Siklu EtherHaul 8010FX - Tech Specs.pdf",
    "image": null
  },
  "EH-ANT-2FT-80GHz": {
    "datasheetPath": "Datasheets/Network/Siklu/Siklu EtherHaul 8010FX - Tech Specs.pdf",
    "image": null
  },
  "EH-MK-SM": {
    "datasheetPath": "Datasheets/Network/Siklu/Siklu MultiHaul TG Terminal Unit T260 - Tech Specs.pdf",
    "image": null
  },
  "EH-POE-AC-60W": {
    "datasheetPath": "Datasheets/Network/Siklu/Siklu EtherHaul 8010FX - Tech Specs.pdf",
    "image": null
  },
  "ETH-SP-G2": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/Ubiquiti Ethernet Surge Protector Gen2 - Tech Specs.pdf",
    "image": "assets/images/products/ubnt-eth-sp-g2.webp"
  },
  "EX2300-24MP": {
    "datasheetPath": "Datasheets/Network/Juniper/ex2300-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex2300-24mp.webp"
  },
  "EX2300-24P": {
    "datasheetPath": "Datasheets/Network/Juniper/ex2300-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex2300-24p.webp"
  },
  "EX2300-24T": {
    "datasheetPath": "Datasheets/Network/Juniper/ex2300-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex2300-24p.webp"
  },
  "EX2300-48MP": {
    "datasheetPath": "Datasheets/Network/Juniper/ex2300-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex2300-48mp.webp"
  },
  "EX2300-48P": {
    "datasheetPath": "Datasheets/Network/Juniper/ex2300-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex2300-48p.webp"
  },
  "EX2300-48T": {
    "datasheetPath": "Datasheets/Network/Juniper/ex2300-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex2300-48p.webp"
  },
  "EX2300-C-12P": {
    "datasheetPath": "Datasheets/Network/Juniper/ex2300-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex2300-c-12p.webp"
  },
  "EX2300-C-12T": {
    "datasheetPath": "Datasheets/Network/Juniper/ex2300-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex2300-c-12t.webp"
  },
  "EX3400-24P": {
    "datasheetPath": "Datasheets/Network/Juniper/ex3400-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex3400-24p.webp"
  },
  "EX3400-24T": {
    "datasheetPath": "Datasheets/Network/Juniper/ex3400-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex3400-24p.webp"
  },
  "EX3400-48P": {
    "datasheetPath": "Datasheets/Network/Juniper/ex3400-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex3400-48p.webp"
  },
  "EX3400-48T": {
    "datasheetPath": "Datasheets/Network/Juniper/ex3400-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex3400-48p.webp"
  },
  "EX4100-24MP": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4100-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex4100-24mp.webp"
  },
  "EX4100-24P": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4100-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex4100-24p.webp"
  },
  "EX4100-24T": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4100-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex4100-24t.webp"
  },
  "EX4100-48MP": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4100-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex4100-48mp.webp"
  },
  "EX4100-48P": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4100-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex4100-48p.webp"
  },
  "EX4100-48T": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4100-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex4100-48t.webp"
  },
  "EX4100-F-12P": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4100-f-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex4100-f-12p.webp"
  },
  "EX4100-F-12T": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4100-f-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex4100-f-12t.webp"
  },
  "EX4100-F-24P": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4100-f-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex4100-f-24p.webp"
  },
  "EX4100-F-24T": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4100-f-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex4100-f-24t.webp"
  },
  "EX4100-F-48P": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4100-f-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex4100-f-48p.webp"
  },
  "EX4100-F-48T": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4100-f-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex4100-f-48t.webp"
  },
  "EX4100-H-12MP": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4100-h-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex4100-h-12t.webp"
  },
  "EX4100-H-12T": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4100-h-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex4100-h-12t.webp"
  },
  "EX4100-H-24MP": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4100-h-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex4100-h-24mp.webp"
  },
  "EX4300-24P": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4300-datasheet.pdf",
    "image": "assets/images/products/juniper-ex4300-24p.webp"
  },
  "EX4300-24T": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4300-datasheet.pdf",
    "image": "assets/images/products/juniper-ex4300-24p.webp"
  },
  "EX4300-32F": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4300-datasheet.pdf",
    "image": "assets/images/products/juniper-ex4300-32f.webp"
  },
  "EX4300-48MP": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4300-datasheet.pdf",
    "image": "assets/images/products/juniper-ex4300-48mp.webp"
  },
  "EX4300-48P": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4300-datasheet.pdf",
    "image": "assets/images/products/juniper-ex4300-48p.webp"
  },
  "EX4300-48T": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4300-datasheet.pdf",
    "image": "assets/images/products/juniper-ex4300-48p.webp"
  },
  "EX4400-24MP": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4400-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex4400-24mp.webp"
  },
  "EX4400-24P": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4400-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex4400-24p.webp"
  },
  "EX4400-24T": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4400-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex4400-24t.webp"
  },
  "EX4400-24X": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4400-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex4400-24x.webp"
  },
  "EX4400-48F": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4400-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex4400-48f.webp"
  },
  "EX4400-48MP": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4400-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex4400-48mp.webp"
  },
  "EX4400-48P": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4400-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex4400-48p.webp"
  },
  "EX4400-48T": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4400-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex4400-48t.webp"
  },
  "EX4600-40F": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4600-datasheet.pdf",
    "image": "assets/images/products/juniper-ex4600-40f.webp"
  },
  "EX4650-48Y-AFI": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4650-datasheet.pdf",
    "image": "assets/images/products/juniper-ex4650-48y.webp"
  },
  "FG-100F": {
    "datasheetPath": null,
    "image": null
  },
  "FG-200F": {
    "datasheetPath": null,
    "image": null
  },
  "FG-40F": {
    "datasheetPath": null,
    "image": null
  },
  "FG-60F": {
    "datasheetPath": null,
    "image": null
  },
  "FG-80F": {
    "datasheetPath": null,
    "image": null
  },
  "ICX7150-24": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 7150 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 7150 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7150-24.webp",
    "photo": "assets/images/products/ruckus-icx7150-24.webp"
  },
  "ICX7150-24P": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 7150 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 7150 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7150-24p.webp",
    "photo": "assets/images/products/ruckus-icx7150-24p.webp"
  },
  "ICX7150-48": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 7150 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 7150 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7150-48.webp",
    "photo": "assets/images/products/ruckus-icx7150-48.webp"
  },
  "ICX7150-48P": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 7150 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 7150 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7150-48p.webp",
    "photo": "assets/images/products/ruckus-icx7150-48p.webp"
  },
  "ICX7150-48PF": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 7150 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 7150 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7150-48pf.webp",
    "photo": "assets/images/products/ruckus-icx7150-48pf.webp"
  },
  "ICX7150-48ZP": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 7150 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 7150 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7150-48zp.webp",
    "photo": "assets/images/products/ruckus-icx7150-48zp.webp"
  },
  "ICX7150-C10ZP": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 7150 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 7150 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7150-c10zp.webp",
    "photo": "assets/images/products/ruckus-icx7150-c10zp.webp"
  },
  "ICX7150-C12P": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 7150 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 7150 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7150-c12p.webp",
    "photo": "assets/images/products/ruckus-icx7150-c12p.webp"
  },
  "ICX7450-24": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX Switch Family Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX Switch Family Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7450-24.webp",
    "photo": "assets/images/products/ruckus-icx7450-24.webp"
  },
  "ICX7450-24P": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX Switch Family Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX Switch Family Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7450-24p.webp",
    "photo": "assets/images/products/ruckus-icx7450-24p.webp"
  },
  "ICX7450-48": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX Switch Family Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX Switch Family Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7450-48.webp",
    "photo": "assets/images/products/ruckus-icx7450-48.webp"
  },
  "ICX7450-48F": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX Switch Family Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX Switch Family Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7450-48f.webp",
    "photo": "assets/images/products/ruckus-icx7450-48f.webp"
  },
  "ICX7450-48P": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX Switch Family Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX Switch Family Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7450-48p.webp",
    "photo": "assets/images/products/ruckus-icx7450-48p.webp"
  },
  "ICX7550-24": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 7550 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 7550 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7550-24.webp",
    "photo": "assets/images/products/ruckus-icx7550-24.webp"
  },
  "ICX7550-24F": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 7550 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 7550 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7550-24f.webp",
    "photo": "assets/images/products/ruckus-icx7550-24f.webp"
  },
  "ICX7550-24P": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 7550 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 7550 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7550-24p.webp",
    "photo": "assets/images/products/ruckus-icx7550-24p.webp"
  },
  "ICX7550-24ZP": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 7550 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 7550 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7550-24zp.webp",
    "photo": "assets/images/products/ruckus-icx7550-24zp.webp"
  },
  "ICX7550-48": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 7550 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 7550 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7550-48.webp",
    "photo": "assets/images/products/ruckus-icx7550-48.webp"
  },
  "ICX7550-48F": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 7550 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 7550 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7550-48f.webp",
    "photo": "assets/images/products/ruckus-icx7550-48f.webp"
  },
  "ICX7550-48P": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 7550 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 7550 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7550-48p.webp",
    "photo": "assets/images/products/ruckus-icx7550-48p.webp"
  },
  "ICX7550-48ZP": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 7550 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 7550 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7550-48zp.webp",
    "photo": "assets/images/products/ruckus-icx7550-48zp.webp"
  },
  "ICX7650-48F": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX Switch Family Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX Switch Family Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7650-48f.webp",
    "photo": "assets/images/products/ruckus-icx7650-48f.webp"
  },
  "ICX7650-48P": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX Switch Family Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX Switch Family Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7650-48p.webp",
    "photo": "assets/images/products/ruckus-icx7650-48p.webp"
  },
  "ICX7650-48ZP": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX Switch Family Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX Switch Family Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7650-48zp.webp",
    "photo": "assets/images/products/ruckus-icx7650-48zp.webp"
  },
  "ICX7750-26Q": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX Switch Family Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX Switch Family Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7750-26q.webp",
    "photo": "assets/images/products/ruckus-icx7750-26q.webp"
  },
  "ICX7750-48C": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX Switch Family Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX Switch Family Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7750-48c.webp",
    "photo": "assets/images/products/ruckus-icx7750-48c.webp"
  },
  "ICX7750-48F": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX Switch Family Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX Switch Family Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7750-48f.webp",
    "photo": "assets/images/products/ruckus-icx7750-48f.webp"
  },
  "ICX7850-32Q": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 7850 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 7850 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7850-32q.webp",
    "photo": "assets/images/products/ruckus-icx7850-32q.webp"
  },
  "ICX7850-48C": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 7850 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 7850 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7850-48c.webp",
    "photo": "assets/images/products/ruckus-icx7850-48c.webp"
  },
  "ICX7850-48F": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 7850 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 7850 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7850-48f.webp",
    "photo": "assets/images/products/ruckus-icx7850-48f.webp"
  },
  "ICX7850-48FS": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 7850 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 7850 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7850-48fs.webp",
    "photo": "assets/images/products/ruckus-icx7850-48fs.webp"
  },
  "ICX8100-24": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 8100 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 8100 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx8100-24.webp",
    "photo": "assets/images/products/ruckus-icx8100-24.webp"
  },
  "ICX8100-24P": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 8100 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 8100 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx8100-24p.webp",
    "photo": "assets/images/products/ruckus-icx8100-24p.webp"
  },
  "ICX8100-48": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 8100 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 8100 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx8100-48.webp",
    "photo": "assets/images/products/ruckus-icx8100-48.webp"
  },
  "ICX8100-48P": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 8100 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 8100 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx8100-48p.webp",
    "photo": "assets/images/products/ruckus-icx8100-48p.webp"
  },
  "ICX8100-48PF": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 8100 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 8100 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx8100-48p.webp",
    "photo": "assets/images/products/ruckus-icx8100-48p.webp"
  },
  "ICX8100-C08PF": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 8100 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 8100 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx8100-c08pf.webp",
    "photo": "assets/images/products/ruckus-icx8100-c08pf.webp"
  },
  "ICX8100-C16P": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 8100 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 8100 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx8100-c16p.webp",
    "photo": "assets/images/products/ruckus-icx8100-c16p.webp"
  },
  "ICX8200-24": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx8200-24.webp",
    "photo": "assets/images/products/ruckus-icx8200-24.webp"
  },
  "ICX8200-24F": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx8200-24f.webp",
    "photo": "assets/images/products/ruckus-icx8200-24f.webp"
  },
  "ICX8200-24FX": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx8200-24fx.webp",
    "photo": "assets/images/products/ruckus-icx8200-24fx.webp"
  },
  "ICX8200-24P": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx8200-24p.webp",
    "photo": "assets/images/products/ruckus-icx8200-24p.webp"
  },
  "ICX8200-24XP2": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx8200-24xp2.webp",
    "photo": "assets/images/products/ruckus-icx8200-24xp2.webp"
  },
  "ICX8200-24ZP": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx8200-24zp.webp",
    "photo": "assets/images/products/ruckus-icx8200-24zp.webp"
  },
  "ICX8200-48": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx8200-48.webp",
    "photo": "assets/images/products/ruckus-icx8200-48.webp"
  },
  "ICX8200-48F": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx8200-48f.webp",
    "photo": "assets/images/products/ruckus-icx8200-48f.webp"
  },
  "ICX8200-48NP2": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx8200-48np2.webp",
    "photo": "assets/images/products/ruckus-icx8200-48np2.webp"
  },
  "ICX8200-48P": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx8200-48p.webp",
    "photo": "assets/images/products/ruckus-icx8200-48p.webp"
  },
  "ICX8200-48PF": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx8200-48pf.webp",
    "photo": "assets/images/products/ruckus-icx8200-48pf.webp"
  },
  "ICX8200-48PF2": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx8200-48pf2.webp",
    "photo": "assets/images/products/ruckus-icx8200-48pf2.webp"
  },
  "ICX8200-48ZP2": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx8200-48zp2.webp",
    "photo": "assets/images/products/ruckus-icx8200-48zp2.webp"
  },
  "ICX8200-C08PF": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx8200-c08pf.webp",
    "photo": "assets/images/products/ruckus-icx8200-c08pf.webp"
  },
  "ICX8200-C08ZP": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx8200-c08zp.webp",
    "photo": "assets/images/products/ruckus-icx8200-c08zp.webp"
  },
  "LBE-5AC-Gen2": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/Ubiquiti airMAX LiteBeam 5AC - Tech Specs.pdf",
    "image": "assets/images/products/ubnt-lbe-5ac.webp"
  },
  "MG51-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS Accessories Datasheet.pdf",
    "image": "assets/images/products/mg51-hw.webp"
  },
  "MH-N366-CCP-PoE-B": {
    "datasheetPath": "Datasheets/Network/Siklu/Siklu MultiHaul TG Node N366 - Tech Specs.pdf",
    "image": "assets/images/products/siklu-mh-tg-n366.webp"
  },
  "MH-T260-CCP-PoE-B": {
    "datasheetPath": "Datasheets/Network/Siklu/Siklu MultiHaul TG Terminal Unit T260 - Tech Specs.pdf",
    "image": "assets/images/products/siklu-mh-tg-t260.webp"
  },
  "MH-T280-CCP-PoE-B": {
    "datasheetPath": "Datasheets/Network/Siklu/Siklu MultiHaul TG Terminal Unit T280 - Tech Specs.pdf",
    "image": "assets/images/products/siklu-mh-tg-t280.webp"
  },
  "MS120-24-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS120 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms120-24.webp"
  },
  "MS120-24P-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS120 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms120-24.webp"
  },
  "MS120-48-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS120 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms120-48.webp"
  },
  "MS120-48FP-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS120 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms120-48.webp"
  },
  "MS120-48LP-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS120 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms120-48.webp"
  },
  "MS120-8-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS120-8 Compact Datasheet.pdf",
    "image": "assets/images/products/meraki-ms120-8.webp"
  },
  "MS120-8FP-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS120-8 Compact Datasheet.pdf",
    "image": "assets/images/products/meraki-ms120-8.webp"
  },
  "MS120-8LP-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS120-8 Compact Datasheet.pdf",
    "image": "assets/images/products/meraki-ms120-8.webp"
  },
  "MS125-24-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS125 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms125-24.webp"
  },
  "MS125-24P-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS125 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms125-24.webp"
  },
  "MS125-48-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS125 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms125-48.webp"
  },
  "MS125-48FP-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS125 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms125-48.webp"
  },
  "MS125-48LP-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS125 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms125-48.webp"
  },
  "MS130-12X-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS130 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms130-12x.webp"
  },
  "MS130-24-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS130 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms130-24.webp"
  },
  "MS130-24P-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS130 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms130-24.webp"
  },
  "MS130-24X-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS130 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms130-24.webp"
  },
  "MS130-48-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS130 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms130-48.webp"
  },
  "MS130-48FP-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS130 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms130-48.webp"
  },
  "MS130-48P-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS130 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms130-48.webp"
  },
  "MS130-48X-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS130 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms130-48.webp"
  },
  "MS130-8-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS130 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms120-8.webp"
  },
  "MS130-8P-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS130 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms120-8.webp"
  },
  "MS130-8X-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS130 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms120-8.webp"
  },
  "MS130R-8P-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS130R Datasheet.pdf",
    "image": "assets/images/products/meraki-ms130r-8p.webp"
  },
  "MS150-24MP-4X-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS150 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms125-24.webp"
  },
  "MS150-24P-4G-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS150 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms120-24.webp"
  },
  "MS150-24P-4X-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS150 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms125-24.webp"
  },
  "MS150-24T-4G-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS150 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms120-24.webp"
  },
  "MS150-24T-4X-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS150 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms125-24.webp"
  },
  "MS150-48FP-4G-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS150 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms120-48.webp"
  },
  "MS150-48FP-4X-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS150 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms125-48.webp"
  },
  "MS150-48LP-4G-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS150 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms120-48.webp"
  },
  "MS150-48LP-4X-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS150 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms125-48.webp"
  },
  "MS150-48MP-4X": {
    "datasheetPath": "Datasheets/Network/Cisco/cisco-meraki_datasheet_ms_family.pdf",
    "image": "assets/images/products/meraki-ms390-24p.webp"
  },
  "MS150-48MP-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS150 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms390-24p.webp"
  },
  "MS210-24P-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS210 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms120-24.webp"
  },
  "MS210-48FP-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS210 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms120-48.webp"
  },
  "MS210-48LP-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS210 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms120-48.webp"
  },
  "MS225-24-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS225 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms125-24.webp"
  },
  "MS225-24P-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS225 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms125-24.webp"
  },
  "MS225-48-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS225 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms125-48.webp"
  },
  "MS225-48FP-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS225 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms125-48.webp"
  },
  "MS225-48LP-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS225 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms125-48.webp"
  },
  "MS250-24-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS250 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms125-24.webp"
  },
  "MS250-24P-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS250 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms125-24.webp"
  },
  "MS250-48-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS250 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms125-48.webp"
  },
  "MS250-48FP-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS250 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms125-48.webp"
  },
  "MS250-48LP-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS250 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms125-48.webp"
  },
  "MS350-24-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS350 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms125-24.webp"
  },
  "MS350-24P-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS350 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms125-24.webp"
  },
  "MS350-48-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS350 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms125-48.webp"
  },
  "MS350-48FP-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS350 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms125-48.webp"
  },
  "MS350-48LP-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS350 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms125-48.webp"
  },
  "MS355-24X-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS355 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms355-24x.webp"
  },
  "MS355-24X2-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS355 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms355-24x.webp"
  },
  "MS355-48X-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS355 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms355-48x.webp"
  },
  "MS355-48X2-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS355 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms355-48x.webp"
  },
  "MS390-24P-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS390 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms390-24p.webp"
  },
  "MS390-24U-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS390 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms390-24p.webp"
  },
  "MS390-24UX-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS390 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms390-24p.webp"
  },
  "MS390-48P-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS390 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms390-48p.webp"
  },
  "MS390-48U-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS390 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms390-48p.webp"
  },
  "MS390-48UX-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS390 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms390-48p.webp"
  },
  "MS390-48UX2-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS390 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms390-48p.webp"
  },
  "MS410-16-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS410 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms410-16.webp"
  },
  "MS410-32-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS410 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms410-32.webp"
  },
  "MS425-16-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS425 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms425-16.webp"
  },
  "MS425-32-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS425 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms425-32.webp"
  },
  "MS450-12-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS450 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms450-12.webp"
  },
  "MX105-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS Accessories Datasheet.pdf",
    "image": "assets/images/products/mx105-hw.webp"
  },
  "MX250-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS Accessories Datasheet.pdf",
    "image": "assets/images/products/mx250-hw.webp"
  },
  "MX450-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS Accessories Datasheet.pdf",
    "image": "assets/images/products/mx450-hw.webp"
  },
  "MX67-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS Accessories Datasheet.pdf",
    "image": "assets/images/products/mx67-hw.webp"
  },
  "MX68CW-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS Accessories Datasheet.pdf",
    "image": "assets/images/products/mx68cw-hw.webp"
  },
  "MX75-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS Accessories Datasheet.pdf",
    "image": "assets/images/products/mx75-hw.webp"
  },
  "MX85-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS Accessories Datasheet.pdf",
    "image": "assets/images/products/mx85-hw.webp"
  },
  "MX95-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS Accessories Datasheet.pdf",
    "image": "assets/images/products/mx95-hw.webp"
  },
  "N000000L125A": {
    "datasheetPath": "Datasheets/Network/Cambium/Cambium cnWave 60 GHz V1000 - Tech Specs.pdf",
    "image": null
  },
  "N000045L002A": {
    "datasheetPath": "Datasheets/Network/Cambium/Cambium cnWave 60 GHz V3000 - Tech Specs.pdf",
    "image": null
  },
  "N000065L001C": {
    "datasheetPath": "Datasheets/Network/Cambium/Cambium cnWave 60 GHz V5000 - Tech Specs.pdf",
    "image": null
  },
  "NBE-5AC-Gen2": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/Ubiquiti NanoBeam 5AC Gen2 - Tech Specs.pdf",
    "image": "assets/images/products/ubnt-nanobeam-5ac.webp"
  },
  "NDR-120-48": {
    "datasheetPath": null,
    "image": "assets/images/products/meanwell-ndr-120-48.webp"
  },
  "NDR-240-48": {
    "datasheetPath": null,
    "image": "assets/images/products/meanwell-ndr-240-48.webp"
  },
  "NF141208": {
    "datasheetPath": null,
    "image": null
  },
  "PA-1410": {
    "datasheetPath": null,
    "image": null
  },
  "PA-440": {
    "datasheetPath": null,
    "image": null
  },
  "PBE-5AC-Gen2": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/Ubiquiti airMAX PowerBeam 5AC - Tech Specs.pdf",
    "image": "assets/images/products/ubnt-pbe-5ac.webp"
  },
  "QFX5110-48S-AFO": {
    "datasheetPath": "Datasheets/Network/Juniper/qfx5110-hardware-guide.pdf",
    "image": "assets/images/products/juniper-qfx5110-48s.webp"
  },
  "QFX5120-32C-AFI": {
    "datasheetPath": "Datasheets/Network/Juniper/qfx5120-hardware-guide.pdf",
    "image": "assets/images/products/juniper-qfx5120-32c.webp"
  },
  "QFX5120-48T-AFO": {
    "datasheetPath": "Datasheets/Network/Juniper/qfx5120-hardware-guide.pdf",
    "image": "assets/images/products/juniper-qfx5120-48t.webp"
  },
  "QFX5120-48Y-AFO": {
    "datasheetPath": "Datasheets/Network/Juniper/qfx5120-hardware-guide.pdf",
    "image": "assets/images/products/juniper-qfx5120-48y.webp"
  },
  "QFX5120-48YM-AFO": {
    "datasheetPath": "Datasheets/Network/Juniper/qfx5120-hardware-guide.pdf",
    "image": "assets/images/products/juniper-qfx5120-48ym.webp"
  },
  "QFX5200-32C-AFI": {
    "datasheetPath": "Datasheets/Network/Juniper/qfx5200-hardware-guide.pdf",
    "image": "assets/images/products/juniper-qfx5200-32c.webp"
  },
  "SMART1500RMXL2Ua": {
    "datasheetPath": null,
    "image": null
  },
  "SMT1500RM2UC": {
    "datasheetPath": null,
    "image": null
  },
  "SMX3000RMLV2UNC": {
    "datasheetPath": null,
    "image": null
  },
  "SRW12US": {
    "datasheetPath": null,
    "image": null
  },
  "SRX1500": {
    "datasheet": "Datasheets/Network/Juniper/srx1500-hardware-guide.pdf",
    "datasheetPath": "Datasheets/Network/Juniper/srx1500-hardware-guide.pdf",
    "image": "assets/images/products/juniper-srx1500.webp",
    "photo": "assets/images/products/juniper-srx1500.webp"
  },
  "SRX300": {
    "datasheet": "Datasheets/Network/Juniper/srx300-hardware-guide.pdf",
    "datasheetPath": "Datasheets/Network/Juniper/srx300-hardware-guide.pdf",
    "image": "assets/images/products/juniper-srx300.webp",
    "photo": "assets/images/products/juniper-srx300.webp"
  },
  "SRX320": {
    "datasheet": "Datasheets/Network/Juniper/srx320-hardware-guide.pdf",
    "datasheetPath": "Datasheets/Network/Juniper/srx320-hardware-guide.pdf",
    "image": "assets/images/products/juniper-srx320.webp",
    "photo": "assets/images/products/juniper-srx320.webp"
  },
  "SRX340": {
    "datasheet": "Datasheets/Network/Juniper/srx340-hardware-guide.pdf",
    "datasheetPath": "Datasheets/Network/Juniper/srx340-hardware-guide.pdf",
    "image": "assets/images/products/juniper-srx340.webp",
    "photo": "assets/images/products/juniper-srx340.webp"
  },
  "SRX345": {
    "datasheet": "Datasheets/Network/Juniper/srx345-hardware-guide.pdf",
    "datasheetPath": "Datasheets/Network/Juniper/srx345-hardware-guide.pdf",
    "image": "assets/images/products/juniper-srx345.webp",
    "photo": "assets/images/products/juniper-srx345.webp"
  },
  "SRX380": {
    "datasheet": "Datasheets/Network/Juniper/srx380-hardware-guide.pdf",
    "datasheetPath": "Datasheets/Network/Juniper/srx380-hardware-guide.pdf",
    "image": "assets/images/products/juniper-srx380.webp",
    "photo": "assets/images/products/juniper-srx380.webp"
  },
  "SRX4100": {
    "datasheet": "Datasheets/Network/Juniper/srx4100-hardware-guide.pdf",
    "datasheetPath": "Datasheets/Network/Juniper/srx4100-hardware-guide.pdf",
    "image": "assets/images/products/juniper-srx4100.webp",
    "photo": "assets/images/products/juniper-srx4100.webp"
  },
  "SRX4200": {
    "datasheet": "Datasheets/Network/Juniper/srx4200-hardware-guide.pdf",
    "datasheetPath": "Datasheets/Network/Juniper/srx4200-hardware-guide.pdf",
    "image": "assets/images/products/juniper-srx4200.webp",
    "photo": "assets/images/products/juniper-srx4200.webp"
  },
  "SRX4600": {
    "datasheet": "Datasheets/Network/Juniper/srx4600-hardware-guide.pdf",
    "datasheetPath": "Datasheets/Network/Juniper/srx4600-hardware-guide.pdf",
    "image": "assets/images/products/juniper-srx4600.webp",
    "photo": "assets/images/products/juniper-srx4600.webp"
  },
  "Trove1WP1": {
    "datasheetPath": null,
    "image": null
  },
  "U-POE": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi PoE Injector 15W - Tech Specs.pdf",
    "image": "assets/images/products/unifi_u_poe_af.webp"
  },
  "U-POE+": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi PoE+ Injector 30W - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_poe_at.webp"
  },
  "U-POE++": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi PoE++ Injector 60W - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_poe_bt.webp"
  },
  "U-PoE": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi PoE Injector 15W - Tech Specs.pdf",
    "image": "assets/images/products/unifi_u_poe_af.webp"
  },
  "U-PoE+": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi PoE+ Injector 30W - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_poe_at.webp"
  },
  "U-PoE++": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi PoE++ Injector 60W - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_poe_bt.webp"
  },
  "U-RACK-6U-TL": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Toolless Mini Rack 6U - Tech Specs.pdf",
    "image": "assets/images/products/unifi_toolless_mini_rack.webp"
  },
  "U-Rack-6U-TL": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Toolless Mini Rack 6U - Tech Specs.pdf",
    "image": "assets/images/products/unifi_toolless_mini_rack.webp"
  },
  "UACC-ADAPTER-210W": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi 210W AC Power Adapter - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_adapter_60w.webp"
  },
  "UACC-ADAPTER-60W": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi 60W AC Power Adapter - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_adapter_60w.webp"
  },
  "UACC-AOC-SFP10": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi 10G Long-Range Direct Attach Cable - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_aoc_sfp10.webp"
  },
  "UACC-AOC-SFP28": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi 25G Long-Range Direct Attach Cable - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_aoc_sfp28.webp"
  },
  "UACC-Adapter-210W": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi 210W AC Power Adapter - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_adapter_60w.webp"
  },
  "UACC-Adapter-60W": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi 60W AC Power Adapter - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_adapter_60w.webp"
  },
  "UACC-CABLE-PATCH-EL-0.15M-W": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Etherlighting Patch Cable - Tech Specs.pdf",
    "image": "assets/images/products/unifi_etherlighting_patch_cable.webp"
  },
  "UACC-CABLE-PATCH-EL-0.3M-W": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Etherlighting Patch Cable - Tech Specs.pdf",
    "image": "assets/images/products/unifi_etherlighting_patch_cable.webp"
  },
  "UACC-CABLE-PATCH-EL-1M-W": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Etherlighting Patch Cable - Tech Specs.pdf",
    "image": "assets/images/products/unifi_etherlighting_patch_cable.webp"
  },
  "UACC-CABLE-PATCH-EL-2M-W": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Etherlighting Patch Cable - Tech Specs.pdf",
    "image": "assets/images/products/unifi_etherlighting_patch_cable.webp"
  },
  "UACC-CABLE-PATCH-EL-3M-W": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Etherlighting Patch Cable - Tech Specs.pdf",
    "image": "assets/images/products/unifi_etherlighting_patch_cable.webp"
  },
  "UACC-CABLE-PATCH-EL-5M-W": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Etherlighting Patch Cable - Tech Specs.pdf",
    "image": "assets/images/products/unifi_etherlighting_patch_cable.webp"
  },
  "UACC-CM-RJ45": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi SFP to RJ45 Adapter - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_cm_rj45.webp"
  },
  "UACC-CM-RJ45-MG": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi SFP+ to RJ45 Adapter - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_cm_rj45_mg.webp"
  },
  "UACC-Cable-Patch-EL-0.15M-W": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Etherlighting Patch Cable - Tech Specs.pdf",
    "image": "assets/images/products/unifi_etherlighting_patch_cable.webp"
  },
  "UACC-Cable-Patch-EL-0.3M-W": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Etherlighting Patch Cable - Tech Specs.pdf",
    "image": "assets/images/products/unifi_etherlighting_patch_cable.webp"
  },
  "UACC-Cable-Patch-EL-1M-W": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Etherlighting Patch Cable - Tech Specs.pdf",
    "image": "assets/images/products/unifi_etherlighting_patch_cable.webp"
  },
  "UACC-Cable-Patch-EL-2M-W": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Etherlighting Patch Cable - Tech Specs.pdf",
    "image": "assets/images/products/unifi_etherlighting_patch_cable.webp"
  },
  "UACC-Cable-Patch-EL-3M-W": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Etherlighting Patch Cable - Tech Specs.pdf",
    "image": "assets/images/products/unifi_etherlighting_patch_cable.webp"
  },
  "UACC-Cable-Patch-EL-5M-W": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Etherlighting Patch Cable - Tech Specs.pdf",
    "image": "assets/images/products/unifi_etherlighting_patch_cable.webp"
  },
  "UACC-DAC-QSFP28": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi 100G Direct Attach Cable - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_dac_qsfp28.webp"
  },
  "UACC-DAC-SFP10": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi 10G Direct Attach Cable - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_dac_sfp10.webp"
  },
  "UACC-DAC-SFP28": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi 25G Direct Attach Cable - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_dac_sfp28.webp"
  },
  "UACC-LRE": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Long-Range Ethernet Repeater - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_lre.webp"
  },
  "UACC-OM-MM-10G-D": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi 10G Multi-Mode Optical Module - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_om_mm_10g_d.webp"
  },
  "UACC-OM-QSFP28-LR4": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi 100G LR4 Single-Mode Optical Module - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_om_qsfp28_lr4.webp"
  },
  "UACC-OM-QSFP28-SR4": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi 100G SR4 Multi-Mode Optical Module - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_om_qsfp28_sr4.webp"
  },
  "UACC-OM-SFP28-LR": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi 25G Single-Mode Optical Module - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_om_sfp28_lr.webp"
  },
  "UACC-OM-SFP28-SR": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi 25G Multi-Mode Optical Module - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_om_sfp28_sr.webp"
  },
  "UACC-OM-SM-10G-D": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi 10G Single-Mode Optical Module - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_om_sm_10g_d.webp"
  },
  "UACC-POE+++-10G": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi PoE+++ 10G Injector - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_poe_plus_plus_10g.webp"
  },
  "UACC-PRO-MAX-16-RM": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Pro Max 16 Rackmount Kit - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_pro_max_16_rm.webp"
  },
  "UACC-PSU-12V-150W": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Hot-Swappable Power Supply 150W - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_psu_12v_150w.webp"
  },
  "UACC-PSU-12V-550W": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Hot-Swappable Power Supply 550W - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_psu_12v_550w.webp"
  },
  "UACC-PSU-54V-1200W": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Hot-Swappable Power Supply 1200W - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_psu_54v_1200w.webp"
  },
  "UACC-PSU-54V-600W": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Hot-Swappable Power Supply 600W - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_psu_54v_600w.webp"
  },
  "UACC-PoE+++-10G": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi PoE+++ 10G Injector - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_poe_plus_plus_10g.webp"
  },
  "UACC-Pro-Max-16-RM": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Pro Max 16 Rackmount Kit - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_pro_max_16_rm.webp"
  },
  "UACC-RACK-12U-WALL-SW-G": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi 12U Wall Swing-Out Cabinet Glass - Tech Specs.pdf",
    "image": "assets/images/products/unifi_rack_12u_wall_sw_g.webp"
  },
  "UACC-RACK-12U-WALL-SW-P": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi 12U Wall Swing-Out Cabinet Perforated - Tech Specs.pdf",
    "image": "assets/images/products/unifi_rack_12u_wall_sw_p.webp"
  },
  "UACC-RACK-42U-1000-P": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi 42U Rack Cabinet 1000mm - Tech Specs.pdf",
    "image": "assets/images/products/unifi_rack_42u_1000_p.webp"
  },
  "UACC-RACK-42U-800-G": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi 42U Rack Cabinet 800mm - Tech Specs.pdf",
    "image": "assets/images/products/unifi_rack_42u_800_g.webp"
  },
  "UACC-RACK-42U-VCM": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi 42U Vertical Cable Manager - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_rack_42u_vcm.webp"
  },
  "UACC-RACK-HCM": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Horizontal Cable Manager - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_rack_hcm.webp"
  },
  "UACC-RACK-PANEL-OCD": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Blank Rack Panel OCD - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_rack_panel_ocd.webp"
  },
  "UACC-RACK-PANEL-PATCH-BLANK-24": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi 24-Port Blank Keystone Patch Panel - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_rack_panel_patch_blank_24.webp"
  },
  "UACC-RACK-RAILS-SLIDE": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Sliding Rack Rails - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_rack_rails_slide.webp"
  },
  "UACC-RACK-SHELF-FD": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Fixed Depth Rack Shelf - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_rack_shelf_fd.webp"
  },
  "UACC-RACK-SHELF-SD": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Sliding Rack Shelf - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_rack_shelf_sd.webp"
  },
  "UACC-Rack-12U-Wall-SW-G": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi 12U Wall Swing-Out Cabinet Glass - Tech Specs.pdf",
    "image": "assets/images/products/unifi_rack_12u_wall_sw_g.webp"
  },
  "UACC-Rack-12U-Wall-SW-P": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi 12U Wall Swing-Out Cabinet Perforated - Tech Specs.pdf",
    "image": "assets/images/products/unifi_rack_12u_wall_sw_p.webp"
  },
  "UACC-Rack-42U-1000-P": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi 42U Rack Cabinet 1000mm - Tech Specs.pdf",
    "image": "assets/images/products/unifi_rack_42u_1000_p.webp"
  },
  "UACC-Rack-42U-800-G": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi 42U Rack Cabinet 800mm - Tech Specs.pdf",
    "image": "assets/images/products/unifi_rack_42u_800_g.webp"
  },
  "UACC-Rack-42U-VCM": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi 42U Vertical Cable Manager - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_rack_42u_vcm.webp"
  },
  "UACC-Rack-HCM": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Horizontal Cable Manager - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_rack_hcm.webp"
  },
  "UACC-Rack-Panel-OCD": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Blank Rack Panel OCD - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_rack_panel_ocd.webp"
  },
  "UACC-Rack-Panel-Patch-Blank-24": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi 24-Port Blank Keystone Patch Panel - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_rack_panel_patch_blank_24.webp"
  },
  "UACC-Rack-Rails-Slide": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Sliding Rack Rails - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_rack_rails_slide.webp"
  },
  "UACC-Rack-Shelf-FD": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Fixed Depth Rack Shelf - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_rack_shelf_fd.webp"
  },
  "UACC-Rack-Shelf-SD": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Sliding Rack Shelf - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_rack_shelf_sd.webp"
  },
  "UBB": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Building Bridge - Tech Specs.pdf",
    "image": "assets/images/products/unifi-ubb.webp"
  },
  "UBB-XG": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Building Bridge XG - Tech Specs.pdf",
    "image": "assets/images/products/unifi-ubb-xg.webp"
  },
  "UBNT-ETH-SP-G2": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/Ubiquiti Ethernet Surge Protector Gen2 - Tech Specs.pdf",
    "image": "assets/images/products/ubnt_eth_sp_g2.webp"
  },
  "UCG-Fiber": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Cloud Gateway Fiber - Tech Specs.pdf",
    "image": "assets/images/products/ucg-fiber.webp"
  },
  "UCG-Industrial": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Industrial - Tech Specs.pdf",
    "image": "assets/images/products/ucg-industrial.webp"
  },
  "UCG-Max": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Cloud Gateway Max - Tech Specs.pdf",
    "image": "assets/images/products/ucg-max.webp"
  },
  "UCG-Ultra": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Ultra - Tech Specs.pdf",
    "image": "assets/images/products/ucg-ultra.webp"
  },
  "UDB-Pro": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Device Bridge Pro - Tech Specs.pdf",
    "image": "assets/images/products/unifi-udb-pro.webp"
  },
  "UDM-Beast": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Dream Machine Beast - Tech Specs.pdf",
    "image": "assets/images/products/udm-beast.webp"
  },
  "UDM-Pro": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Dream Machine Pro - Tech Specs.pdf",
    "image": "assets/images/products/udm-pro.webp"
  },
  "UDM-Pro-Max": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Dream Machine Pro Max - Tech Specs.pdf",
    "image": "assets/images/products/udm-pro-max.webp"
  },
  "UDM-SE": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Dream Machine Special Edition - Tech Specs.pdf",
    "image": "assets/images/products/udm-se.webp"
  },
  "UDW": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Dream Wall - Tech Specs.pdf",
    "image": "assets/images/products/udw.webp"
  },
  "UNIFI-RACK-12U-WALL-SW-G": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi 12U Wall Swing-Out Cabinet Glass - Tech Specs.pdf",
    "image": "assets/images/products/unifi_rack_12u_wall_sw_g.webp"
  },
  "UNIFI-RACK-12U-WALL-SW-P": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi 12U Wall Swing-Out Cabinet Perforated - Tech Specs.pdf",
    "image": "assets/images/products/unifi_rack_12u_wall_sw_p.webp"
  },
  "UNIFI-RACK-42U-1000-P": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi 42U Rack Cabinet 1000mm - Tech Specs.pdf",
    "image": "assets/images/products/unifi_rack_42u_1000_p.webp"
  },
  "UNIFI-RACK-42U-800-G": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi 42U Rack Cabinet 800mm - Tech Specs.pdf",
    "image": "assets/images/products/unifi_rack_42u_800_g.webp"
  },
  "UNIFI-U-POE-AF": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi PoE Injector 15W - Tech Specs.pdf",
    "image": "assets/images/products/unifi_u_poe_af.webp"
  },
  "UNIFI-U-RACK-6U-TL": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Toolless Mini Rack 6U - Tech Specs.pdf",
    "image": "assets/images/products/unifi_toolless_mini_rack.webp"
  },
  "UNIFI-UACC-ADAPTER-210W": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi 210W AC Power Adapter - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_adapter_60w.webp"
  },
  "UNIFI-UACC-ADAPTER-60W": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi 60W AC Power Adapter - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_adapter_60w.webp"
  },
  "UNIFI-UACC-LRE": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Long-Range Ethernet Repeater - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_lre.webp"
  },
  "UNIFI-UACC-POE-AT": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi PoE+ Injector 30W - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_poe_at.webp"
  },
  "UNIFI-UACC-POE-BT": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi PoE++ Injector 60W - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_poe_bt.webp"
  },
  "UNIFI-UACC-POE-PLUS-PLUS-10G": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi PoE+++ 10G Injector - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_poe_plus_plus_10g.webp"
  },
  "UNIFI-UACC-PRO-MAX-16-RM": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Pro Max 16 Rackmount Kit - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_pro_max_16_rm.webp"
  },
  "UNIFI-UACC-PSU-12V-150W": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Hot-Swappable Power Supply 150W - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_psu_12v_150w.webp"
  },
  "UNIFI-UACC-PSU-12V-550W": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Hot-Swappable Power Supply 550W - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_psu_12v_550w.webp"
  },
  "UNIFI-UACC-PSU-54V-1200W": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Hot-Swappable Power Supply 1200W - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_psu_54v_1200w.webp"
  },
  "UNIFI-UACC-PSU-54V-600W": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Hot-Swappable Power Supply 600W - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_psu_54v_600w.webp"
  },
  "UNIFI-UACC-RACK-42U-VCM": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi 42U Vertical Cable Manager - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_rack_42u_vcm.webp"
  },
  "UNIFI-UACC-RACK-HCM": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Horizontal Cable Manager - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_rack_hcm.webp"
  },
  "UNIFI-UACC-RACK-PANEL-OCD": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Blank Rack Panel OCD - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_rack_panel_ocd.webp"
  },
  "UNIFI-UACC-RACK-PANEL-PATCH-BLANK-24": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi 24-Port Blank Keystone Patch Panel - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_rack_panel_patch_blank_24.webp"
  },
  "UNIFI-UACC-RACK-RAILS-SLIDE": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Sliding Rack Rails - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_rack_rails_slide.webp"
  },
  "UNIFI-UACC-RACK-SHELF-FD": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Fixed Depth Rack Shelf - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_rack_shelf_fd.webp"
  },
  "UNIFI-UACC-RACK-SHELF-SD": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Sliding Rack Shelf - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_rack_shelf_sd.webp"
  },
  "UNIFI-UPS-2U-PRO": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi UPS 2U Pro - Tech Specs.pdf",
    "image": "assets/images/products/unifi_ups_2u_pro.webp"
  },
  "UNIFI-USP-CABLE": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi SmartPower Cable - Tech Specs.pdf",
    "image": "assets/images/products/unifi_usp_cable.webp"
  },
  "UNIFI-USP-PDU-HD": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Power Distribution Hi-Density - Tech Specs.pdf",
    "image": "assets/images/products/unifi_usp_pdu_hd.webp"
  },
  "UNIFI-USP-PDU-PRO": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Power Distribution Pro - Tech Specs.pdf",
    "image": "assets/images/products/unifi_usp_pdu_pro.webp"
  },
  "UNIFI-USP-RPS": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Redundant Power - Tech Specs.pdf",
    "image": "assets/images/products/unifi_usp_rps.webp"
  },
  "UNIFI-USW-FLEX-UTILITY": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Flex Utility - Tech Specs.pdf",
    "image": "assets/images/products/unifi_usw_flex_utility.webp"
  },
  "UNIFI-USW-MISSION-CRITICAL": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi UPS PoE Switch - Tech Specs.pdf",
    "image": "assets/images/products/unifi_usw_mission_critical.webp"
  },
  "UPS-2U-PRO": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi UPS 2U Pro - Tech Specs.pdf",
    "image": "assets/images/products/unifi_ups_2u_pro.webp"
  },
  "UPS-2U-Pro": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi UPS 2U Pro - Tech Specs.pdf",
    "image": "assets/images/products/unifi_ups_2u_pro.webp"
  },
  "USP-CABLE": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi SmartPower Cable - Tech Specs.pdf",
    "image": "assets/images/products/unifi_usp_cable.webp"
  },
  "USP-Cable": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi SmartPower Cable - Tech Specs.pdf",
    "image": "assets/images/products/unifi_usp_cable.webp"
  },
  "USP-PDU-HD": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Power Distribution Hi-Density - Tech Specs.pdf",
    "image": "assets/images/products/unifi_usp_pdu_hd.webp"
  },
  "USP-PDU-PRO": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Power Distribution Pro - Tech Specs.pdf",
    "image": "assets/images/products/unifi_usp_pdu_pro.webp"
  },
  "USP-PDU-Pro": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Power Distribution Pro - Tech Specs.pdf",
    "image": "assets/images/products/unifi_usp_pdu_pro.webp"
  },
  "USP-RPS": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Redundant Power - Tech Specs.pdf",
    "image": "assets/images/products/unifi_usp_rps.webp"
  },
  "USW-16-PoE": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Standard 16 PoE - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-16-poe.webp"
  },
  "USW-24": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Standard 24 - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-24.webp"
  },
  "USW-24-PoE": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Standard 24 PoE - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-24-poe.webp"
  },
  "USW-48": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Standard 48 - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-48.webp"
  },
  "USW-48-PoE": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Standard 48 PoE - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-48-poe.webp"
  },
  "USW-Aggregation": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Aggregation - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-agg.webp"
  },
  "USW-FLEX-UTILITY": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Flex Utility - Tech Specs.pdf",
    "image": "assets/images/products/unifi_usw_flex_utility.webp"
  },
  "USW-Flex": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Flex - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-flex.webp"
  },
  "USW-Flex-2.5G-5": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Flex 2.5G - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-flex-2-5g-5.webp"
  },
  "USW-Flex-2.5G-8": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Flex 2.5G - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-flex-2-5g-5.webp"
  },
  "USW-Flex-Mini": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Flex Mini - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-flex-mini.webp"
  },
  "USW-Flex-Utility": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Flex Utility - Tech Specs.pdf",
    "image": "assets/images/products/unifi_usw_flex_utility.webp"
  },
  "USW-Flex-XG": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Flex 10 GbE - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-flex-xg.webp"
  },
  "USW-Hi-Capacity-Aggregation": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Hi-Capacity Aggregation - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-hi-cap-agg.webp"
  },
  "USW-Industrial": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Industrial - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-industrial.webp"
  },
  "USW-Lite-16-PoE": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Lite 16 PoE - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-lite-16-poe.webp"
  },
  "USW-Lite-8-PoE": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Lite 8 PoE - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-lite-8-poe.webp"
  },
  "USW-MISSION-CRITICAL": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi UPS PoE Switch - Tech Specs.pdf",
    "image": "assets/images/products/unifi_usw_mission_critical.webp"
  },
  "USW-Mission-Critical": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi UPS PoE Switch - Tech Specs.pdf",
    "image": "assets/images/products/unifi_usw_mission_critical.webp"
  },
  "USW-Pro-24": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Pro 24 - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-pro-24.webp"
  },
  "USW-Pro-24-PoE": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Pro 24 PoE - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-pro-24-poe.webp"
  },
  "USW-Pro-48": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Pro 48 - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-pro-48.webp"
  },
  "USW-Pro-48-PoE": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Pro 48 PoE - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-pro-48-poe.webp"
  },
  "USW-Pro-8-PoE": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Pro 8 PoE - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-pro-8-poe.webp"
  },
  "USW-Pro-Aggregation": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Pro XG Aggregation - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-pro-agg.webp"
  },
  "USW-Pro-HD-24": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Pro HD 24 - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-pro-hd-24.webp"
  },
  "USW-Pro-HD-24-PoE": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Pro HD 24 PoE - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-pro-hd-24-poe.webp"
  },
  "USW-Pro-Max-16": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Pro Max 16 - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-pro-max-16.webp"
  },
  "USW-Pro-Max-16-PoE": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Pro Max 16 PoE - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-pro-max-16-poe.webp"
  },
  "USW-Pro-Max-24": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Pro Max 24 - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-pro-max-24.webp"
  },
  "USW-Pro-Max-24-PoE": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Pro Max 24 PoE - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-pro-max-24-poe.webp"
  },
  "USW-Pro-Max-48": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Pro Max 48 - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-pro-max-48.webp"
  },
  "USW-Pro-Max-48-PoE": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Pro Max 48 PoE - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-pro-max-48-poe.webp"
  },
  "USW-Pro-XG-10-PoE": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Pro XG 10 PoE - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-pro-xg-10-poe.webp"
  },
  "USW-Pro-XG-24": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Pro XG 24 - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-pro-xg-24.webp"
  },
  "USW-Pro-XG-24-PoE": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Pro XG 24 PoE - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-pro-xg-24-poe.webp"
  },
  "USW-Pro-XG-48": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Pro XG 48 - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-pro-xg-48.webp"
  },
  "USW-Pro-XG-48-PoE": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Pro XG 48 PoE - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-pro-xg-48-poe.webp"
  },
  "USW-Pro-XG-8-PoE": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Pro XG 8 PoE - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-pro-xg-8-poe.webp"
  },
  "USW-Pro-XG-Aggregation": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Pro XG Aggregation - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-pro-xg-agg.webp"
  },
  "USW-Ultra": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Ultra - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-ultra.webp"
  },
  "USW-Ultra-210W": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Ultra 210W - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-ultra.webp"
  },
  "USW-Ultra-60W": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Ultra 60W - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-ultra.webp"
  },
  "USW-WAN": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi WAN Switch - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-wan.webp"
  },
  "USW-WAN-RJ45": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi WAN Switch RJ45 - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-wan-rj45.webp"
  },
  "UX": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Express - Tech Specs.pdf",
    "image": "assets/images/products/ux.webp"
  },
  "UXG-Enterprise": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Enterprise Firewall - Tech Specs.pdf",
    "image": "assets/images/products/uxg-enterprise.webp"
  },
  "UXG-Pro": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Gateway Pro - Tech Specs.pdf",
    "image": "assets/images/products/uxg-pro.webp"
  },
  "UniFi-5G-Max": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi 5G Max - Tech Specs.pdf",
    "image": "assets/images/products/unifi-5g-max.webp"
  },
  "Wave-AP": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/Ubiquiti Wave AP - Tech Specs.pdf",
    "image": "assets/images/products/ubnt-wave-ap.webp"
  },
  "Wave-LR": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/Ubiquiti Wave Long-Range - Tech Specs.pdf",
    "image": "assets/images/products/ubnt-wave-lr.webp"
  },
  "Wave-Nano": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/Ubiquiti Wave Nano - Tech Specs.pdf",
    "image": "assets/images/products/ubnt-wave-nano.webp"
  },
  "Wave-Precision-Mount": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/Ubiquiti Wave Pro - Tech Specs.pdf",
    "image": null
  },
  "Wave-Pro": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/Ubiquiti Wave Pro - Tech Specs.pdf",
    "image": "assets/images/products/ubnt-wave-pro.webp"
  },
  "Z4C-HW": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS Accessories Datasheet.pdf",
    "image": "assets/images/products/z4c-hw.webp"
  },
  "af60-xr": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/Ubiquiti airFiber 60 XR - Tech Specs.pdf",
    "image": "assets/images/products/ubnt-af60-xr.webp"
  },
  "altelix-nf141208": {
    "datasheetPath": null,
    "image": null
  },
  "altronix-trove1wp1": {
    "datasheetPath": null,
    "image": null
  },
  "amg-140-1gr": {
    "datasheetPath": "Datasheets/Network/AMG/AMG140-1GR Series Datasheet D37287-01.pdf",
    "image": "assets/images/products/amg-140-1gr.webp"
  },
  "amg-150-1gat-p30": {
    "datasheetPath": "Datasheets/Network/AMG/AMG150 1 Port Series Datasheet D33646-05.pdf",
    "image": "assets/images/products/amg-150-1gat-p30.webp"
  },
  "amg-150-1gbt-p90": {
    "datasheetPath": "Datasheets/Network/AMG/AMG150 1 Port Series Datasheet D33646-05.pdf",
    "image": "assets/images/products/amg-150-1gat-p30.webp"
  },
  "amg-150-1gbt-p90-lv": {
    "datasheetPath": "Datasheets/Network/AMG/AMG150 1 Port LV Series Datasheet D33647-04.pdf",
    "image": "assets/images/products/amg-150-1gbt-p90-lv.webp"
  },
  "amg-150-1xbt-p90": {
    "datasheetPath": "Datasheets/Network/AMG/AMG150 1 Port Series Datasheet D33646-05.pdf",
    "image": "assets/images/products/amg-150-1gat-p30.webp"
  },
  "amg-150-2gbt-p180": {
    "datasheetPath": "Datasheets/Network/AMG/AMG150 2 Port Series Datasheet D33051-08.pdf",
    "image": "assets/images/products/amg-150-2gbt-p180.webp"
  },
  "amg-150-4gat-p120": {
    "datasheetPath": "Datasheets/Network/AMG/AMG150 4_6 Port Series Datasheet D33393-03.pdf",
    "image": "assets/images/products/amg-150-4gat-p120.webp"
  },
  "amg-150-8gat-p240": {
    "datasheetPath": "Datasheets/Network/AMG/AMG150 8 Port Series Datasheet D33619-03.pdf",
    "image": "assets/images/products/amg-150-8gat-p240.webp"
  },
  "amg-155-1gat-p30": {
    "datasheetPath": "Datasheets/Network/AMG/AMG155 1 Port Series Datasheet D33648-08.pdf",
    "image": "assets/images/products/amg-155-1gat-p30.webp"
  },
  "amg-156-1gbt-p90": {
    "datasheetPath": "Datasheets/Network/AMG/AMG156 8_16_24 Series Datasheet D33394-03.pdf",
    "image": "assets/images/products/amg-156-1gbt-p90.webp"
  },
  "amg-160-1f-1ec": {
    "datasheetPath": "Datasheets/Network/AMG/AMG160-1F-1EC Datasheet D37139-04.pdf",
    "image": "assets/images/products/amg-160-1f-1ec.webp"
  },
  "amg-172-1g-1v": {
    "datasheetPath": "Datasheets/Network/AMG/AMG172 Series Datasheet D39111-10.pdf",
    "image": "assets/images/products/amg-172-1g-1v.webp"
  },
  "amg-2015": {
    "datasheetPath": "Datasheets/Network/AMG/AMG250R Series Datasheet D33036-07.pdf",
    "image": "assets/images/products/amg-2015.webp"
  },
  "amg-2015-dr": {
    "datasheetPath": "Datasheets/Network/AMG/AMG2015-DR 3U Rack Datasheet D18966-02.pdf",
    "image": "assets/images/products/amg-2015-dr.webp"
  },
  "amg-2031": {
    "datasheetPath": "Datasheets/Network/AMG/AMG2031 1U Rack Datasheet D33276-01.pdf",
    "image": "assets/images/products/amg-2031.webp"
  },
  "amg-2035": {
    "datasheetPath": "Datasheets/Network/AMG/AMG2035 90 Degree Bracket Datasheet D39283-01.pdf",
    "image": "assets/images/products/amg-2035.webp"
  },
  "amg-2036-rp-aa": {
    "datasheetPath": "Datasheets/Network/AMG/AMG2036 Blade Chassis Datasheet D33818-03.pdf",
    "image": "assets/images/products/amg-2036-rp-aa.webp"
  },
  "amg-210m-1g-1s": {
    "datasheetPath": "Datasheets/Network/AMG/AMG210C Media Converter Rack Datasheet D39120-07.pdf",
    "image": "assets/images/products/amg-210m-1g-1s.webp"
  },
  "amg-250-1g-1s": {
    "datasheetPath": "Datasheets/Network/AMG/AMG250 Series Datasheet D33031-08.pdf",
    "image": "assets/images/products/amg-250-1g-1s.webp"
  },
  "amg-250-1gat-1s": {
    "datasheetPath": "Datasheets/Network/AMG/AMG250 Series Datasheet D33031-08.pdf",
    "image": "assets/images/products/amg-250-1g-1s.webp"
  },
  "amg-250-1gbt-1s": {
    "datasheetPath": "Datasheets/Network/AMG/AMG250 Series Datasheet D33031-08.pdf",
    "image": "assets/images/products/amg-250-1g-1s.webp"
  },
  "amg-250-1xbt-1xs": {
    "datasheetPath": "Datasheets/Network/AMG/AMG250 10G Series Datasheet D33797-01.pdf",
    "image": "assets/images/products/amg-250-1xbt-1xs.webp"
  },
  "amg-250-2g-1s": {
    "datasheetPath": "Datasheets/Network/AMG/AMG250 Series Datasheet D33031-08.pdf",
    "image": "assets/images/products/amg-250-2g-1s.webp"
  },
  "amg-250-2g-2s": {
    "datasheetPath": "Datasheets/Network/AMG/AMG250 Series Datasheet D33031-08.pdf",
    "image": "assets/images/products/amg-250-2g-2s.webp"
  },
  "amg-250r-1g-1s": {
    "datasheetPath": "Datasheets/Network/AMG/AMG250R Series Datasheet D33036-07.pdf",
    "image": "assets/images/products/amg-250r-1g-1s.webp"
  },
  "amg-250r-4g-4s": {
    "datasheetPath": "Datasheets/Network/AMG/AMG250R Series Datasheet D33036-07.pdf",
    "image": "assets/images/products/amg-250r-1g-1s.webp"
  },
  "amg-255-2gbt-1s": {
    "datasheetPath": "Datasheets/Network/AMG/AMG255 120W Series Datasheet D33467-03.pdf",
    "image": "assets/images/products/amg-255-2gbt-1s.webp"
  },
  "amg-260m-1g-1s": {
    "datasheetPath": "Datasheets/Network/AMG/AMG210C Media Converter Rack Datasheet D39120-07.pdf",
    "image": "assets/images/products/amg-210m-1g-1s.webp"
  },
  "amg-260m-1gbt-1s-p90": {
    "datasheetPath": "Datasheets/Network/AMG/AMG210C Media Converter Rack Datasheet D39120-07.pdf",
    "image": "assets/images/products/amg-210m-1g-1s.webp"
  },
  "amg-265m-1g-1s": {
    "datasheetPath": "Datasheets/Network/AMG/AMG210C Media Converter Rack Datasheet D39120-07.pdf",
    "image": "assets/images/products/amg-210m-1g-1s.webp"
  },
  "amg-350-14gat-2s": {
    "datasheetPath": "Datasheets/Network/AMG/AMG350-14GAT-2S-P300 Datasheet D33751-02.pdf",
    "image": "assets/images/products/amg-350-14gat-2s.webp"
  },
  "amg-350-2g-2s": {
    "datasheetPath": "Datasheets/Network/AMG/AMG350-2G-2S Series Datasheet D33052-08.pdf",
    "image": "assets/images/products/amg-350-2g-2s.webp"
  },
  "amg-350-2gat-2s": {
    "datasheetPath": "Datasheets/Network/AMG/AMG350-2G-2S Series Datasheet D33052-08.pdf",
    "image": "assets/images/products/amg-350-2g-2s.webp"
  },
  "amg-350-2gbt-2s": {
    "datasheetPath": "Datasheets/Network/AMG/AMG350-2G-2S Series Datasheet D33052-08.pdf",
    "image": "assets/images/products/amg-350-2g-2s.webp"
  },
  "amg-350-4g-1c-1s": {
    "datasheetPath": "Datasheets/Network/AMG/AMG350-4G-1C-1S Series Datasheet D33397-03.pdf",
    "image": "assets/images/products/amg-350-4g-1c-1s.webp"
  },
  "amg-350-4gat-1c-1s": {
    "datasheetPath": "Datasheets/Network/AMG/AMG350-4G-1C-1S Series Datasheet D33397-03.pdf",
    "image": "assets/images/products/amg-350-4g-1c-1s.webp"
  },
  "amg-350-4gat-1g-pd": {
    "datasheetPath": "Datasheets/Network/AMG/AMG350-4GAT-1G-P75-PD Datasheet D33641-01.pdf",
    "image": "assets/images/products/amg-350-4gat-1g-pd.webp"
  },
  "amg-350-4gbt-1c-1s": {
    "datasheetPath": "Datasheets/Network/AMG/AMG350-4G-1C-1S Series Datasheet D33397-03.pdf",
    "image": "assets/images/products/amg-350-4g-1c-1s.webp"
  },
  "amg-350-5g": {
    "datasheetPath": "Datasheets/Network/AMG/AMG350-5G Series Datasheet D33403-03.pdf",
    "image": "assets/images/products/amg-350-5g.webp"
  },
  "amg-350-8g": {
    "datasheetPath": "Datasheets/Network/AMG/AMG350-8G Series Datasheet D33404-01.pdf",
    "image": "assets/images/products/amg-350-8g.webp"
  },
  "amg-350-8gat": {
    "datasheetPath": "Datasheets/Network/AMG/AMG350-8G Series Datasheet D33404-01.pdf",
    "image": "assets/images/products/amg-350-8g.webp"
  },
  "amg-350-8gat-2s": {
    "datasheetPath": "Datasheets/Network/AMG/AMG350-8G Series Datasheet D33404-01.pdf",
    "image": "assets/images/products/amg-350-8g.webp"
  },
  "amg-510-16gat-2c": {
    "datasheetPath": "Datasheets/Network/AMG/AMG510-16G Series Datasheet D39131-06.pdf",
    "image": "assets/images/products/amg-510-16gat-2c.webp"
  },
  "amg-510-22gat-2cat-2s": {
    "datasheetPath": "Datasheets/Network/AMG/AMG510-24G RP Series Datasheet D39150-05.pdf",
    "image": "assets/images/products/amg-510-24g-4xs.webp"
  },
  "amg-510-24g-4xs": {
    "datasheetPath": "Datasheets/Network/AMG/AMG510-24G RP Series Datasheet D39150-05.pdf",
    "image": "assets/images/products/amg-510-24g-4xs.webp"
  },
  "amg-510-24gat-4xs": {
    "datasheetPath": "Datasheets/Network/AMG/AMG510-24G RP Series Datasheet D39150-05.pdf",
    "image": "assets/images/products/amg-510-24g-4xs.webp"
  },
  "amg-510-24gat-4xs-rp": {
    "datasheetPath": "Datasheets/Network/AMG/AMG510-24G RP Series Datasheet D39150-05.pdf",
    "image": "assets/images/products/amg-510-24g-4xs.webp"
  },
  "amg-510-48gat-4xs": {
    "datasheetPath": "Datasheets/Network/AMG/AMG510-48G Series Datasheet D39133-06.pdf",
    "image": "assets/images/products/amg-510-48gat-4xs.webp"
  },
  "amg-510-4g-24s-4xs": {
    "datasheetPath": "Datasheets/Network/AMG/AMG510-24G RP Series Datasheet D39150-05.pdf",
    "image": "assets/images/products/amg-510-24g-4xs.webp"
  },
  "amg-510-8g-2s": {
    "datasheetPath": "Datasheets/Network/AMG/AMG510-8G Series Datasheet D39130-03.pdf",
    "image": "assets/images/products/amg-510-8g-2s.webp"
  },
  "amg-510-8gat-2s": {
    "datasheetPath": "Datasheets/Network/AMG/AMG510-8G Series Datasheet D39130-03.pdf",
    "image": "assets/images/products/amg-510-8g-2s.webp"
  },
  "amg-510-8gbt-16gat-4xs": {
    "datasheetPath": "Datasheets/Network/AMG/AMG510-16G Series Datasheet D39131-06.pdf",
    "image": "assets/images/products/amg-510-16gat-2c.webp"
  },
  "amg-560-24gat-4s-rp-ad": {
    "datasheetPath": "Datasheets/Network/AMG/AMG560-24G Series Datasheet D39136-01.pdf",
    "image": "assets/images/products/amg-560-24gat-4xs.webp"
  },
  "amg-560-24gat-4xs": {
    "datasheetPath": "Datasheets/Network/AMG/AMG560-24G Series Datasheet D39136-01.pdf",
    "image": "assets/images/products/amg-560-24gat-4xs.webp"
  },
  "amg-560-8g-12s": {
    "datasheetPath": "Datasheets/Network/AMG/AMG560-8G Series Datasheet D39245-04.pdf",
    "image": "assets/images/products/amg-560-8g-4s.webp"
  },
  "amg-560-8g-4s": {
    "datasheetPath": "Datasheets/Network/AMG/AMG560-8G Series Datasheet D39245-04.pdf",
    "image": "assets/images/products/amg-560-8g-4s.webp"
  },
  "amg-560-8g-8s-4xs": {
    "datasheetPath": "Datasheets/Network/AMG/AMG560-8G Series Datasheet D39245-04.pdf",
    "image": "assets/images/products/amg-560-8g-4s.webp"
  },
  "amg-560-8gat-4s": {
    "datasheetPath": "Datasheets/Network/AMG/AMG560-8G Series Datasheet D39245-04.pdf",
    "image": "assets/images/products/amg-560-8g-4s.webp"
  },
  "amg-560-8gat-4xs": {
    "datasheetPath": "Datasheets/Network/AMG/AMG560-8G Series Datasheet D39245-04.pdf",
    "image": "assets/images/products/amg-560-8g-4s.webp"
  },
  "amg-570-12gat-4s": {
    "datasheetPath": "Datasheets/Network/AMG/AMG570 12-16 Port Series Datasheet D36352-05.pdf",
    "image": "assets/images/products/amg-570-8gat-4s.webp"
  },
  "amg-570-16gat-8s": {
    "datasheetPath": "Datasheets/Network/AMG/AMG570 16-24 Port Series Datasheet D36353-06.pdf",
    "image": "assets/images/products/amg-570-16gat-8s.webp"
  },
  "amg-570-2gbt-10gat-4s": {
    "datasheetPath": "Datasheets/Network/AMG/AMG570 6 Port Series Datasheet D36098-13.pdf",
    "image": "assets/images/products/amg-570-4g-2s.webp"
  },
  "amg-570-2gbt-2gat-2s": {
    "datasheetPath": "Datasheets/Network/AMG/AMG570 6 Port Series Datasheet D36098-13.pdf",
    "image": "assets/images/products/amg-570-4g-2s.webp"
  },
  "amg-570-2gbt-4gat-2g-3s": {
    "datasheetPath": "Datasheets/Network/AMG/AMG570 6 Port Series Datasheet D36098-13.pdf",
    "image": "assets/images/products/amg-570-4g-2s.webp"
  },
  "amg-570-4g-2s": {
    "datasheetPath": "Datasheets/Network/AMG/AMG570 6 Port Series Datasheet D36098-13.pdf",
    "image": "assets/images/products/amg-570-4g-2s.webp"
  },
  "amg-570-4gat-2s": {
    "datasheetPath": "Datasheets/Network/AMG/AMG570 6 Port Series Datasheet D36098-13.pdf",
    "image": "assets/images/products/amg-570-4g-2s.webp"
  },
  "amg-570-4gat-2s-k": {
    "datasheetPath": "Datasheets/Network/AMG/AMG570-4G-2S-K Series Datasheet D36307-03.pdf",
    "image": "assets/images/products/amg-570-4g-2s.webp"
  },
  "amg-570-4gbt-3s": {
    "datasheetPath": "Datasheets/Network/AMG/AMG570 6 Port Series Datasheet D36098-13.pdf",
    "image": "assets/images/products/amg-570-4g-2s.webp"
  },
  "amg-570-4gbt-8gat-4g-8s": {
    "datasheetPath": "Datasheets/Network/AMG/AMG570 11 Port Series Datasheet D36097-16.pdf",
    "image": "assets/images/products/amg-570-8g-3s.webp"
  },
  "amg-570-8g-3s": {
    "datasheetPath": "Datasheets/Network/AMG/AMG570 11 Port Series Datasheet D36097-16.pdf",
    "image": "assets/images/products/amg-570-8g-3s.webp"
  },
  "amg-570-8gat-3s": {
    "datasheetPath": "Datasheets/Network/AMG/AMG570 11 Port Series Datasheet D36097-16.pdf",
    "image": "assets/images/products/amg-570-8g-3s.webp"
  },
  "amg-570-8gat-3s-k": {
    "datasheetPath": "Datasheets/Network/AMG/AMG570-8G-3S-K Series Datasheet D36306-03.pdf",
    "image": "assets/images/products/amg-570-8g-3s.webp"
  },
  "amg-570-8gat-3s-lv": {
    "datasheetPath": "Datasheets/Network/AMG/AMG570 11 Port LV Series Datasheet D36304-06.pdf",
    "image": "assets/images/products/amg-570-8gat-3s-lv.webp"
  },
  "amg-570-8gat-4s": {
    "datasheetPath": "Datasheets/Network/AMG/AMG570 12-16 Port Series Datasheet D36352-05.pdf",
    "image": "assets/images/products/amg-570-8gat-4s.webp"
  },
  "amg-570-8gbt-4s": {
    "datasheetPath": "Datasheets/Network/AMG/AMG570 12-16 Port Series Datasheet D36352-05.pdf",
    "image": "assets/images/products/amg-570-8gat-4s.webp"
  },
  "amg-750-1g-4gat-104-p120": {
    "datasheetPath": "Datasheets/Network/AMG/AMG750 Series Datasheet D39110-10.pdf",
    "image": "assets/images/products/amg-eoc-7501.webp"
  },
  "amg-816-1f-rp-ad": {
    "datasheetPath": "Datasheets/Network/AMG/AMG816 Series Datasheet D35161-02.pdf",
    "image": "assets/images/products/amg-816-1f-rp-ad.webp"
  },
  "amg-840-6n-4xs": {
    "datasheetPath": "Datasheets/Network/AMG/AMG840 Series Datasheet D35264-01.pdf",
    "image": "assets/images/products/amg-840-6n-4xs.webp"
  },
  "amg-8870f-03-90": {
    "datasheetPath": "Datasheets/Network/AMG/AMG8870F-03-90 Datasheet D26091-02.pdf",
    "image": "assets/images/products/amg-8870f-03-90.webp"
  },
  "amg-8870f-06": {
    "datasheetPath": "Datasheets/Network/AMG/AMG8870F-06 Datasheet D26090-04.pdf",
    "image": "assets/images/products/amg-8870f-06.webp"
  },
  "amg-8870f-m-e": {
    "datasheetPath": "Datasheets/Network/AMG/AMG8870F-M-E Datasheet D26089-03.pdf",
    "image": "assets/images/products/amg-8870f-m-e.webp"
  },
  "amg-eoc-7501": {
    "datasheetPath": "Datasheets/Network/AMG/AMG750 Series Datasheet D39110-10.pdf",
    "image": "assets/images/products/amg-eoc-7501.webp"
  },
  "amg-mnt-mag-04": {
    "datasheetPath": "Datasheets/Network/AMG/AMGMNT-MAG Series Datasheet D39361-00.pdf",
    "image": "assets/images/products/amg-mnt-mag-04.webp"
  },
  "amg-sfp-conv-7111": {
    "datasheetPath": "Datasheets/Network/AMG/AMG140-1GR Series Datasheet D37287-01.pdf",
    "image": "assets/images/products/amg-350-4g-1c-1s.webp"
  },
  "amg140-1gr": {
    "datasheetPath": "Datasheets/Network/AMG/AMG140-1GR Series Datasheet D37287-01.pdf",
    "image": "assets/images/products/amg-140-1gr.webp"
  },
  "amg150-1gat-p30": {
    "datasheetPath": "Datasheets/Network/AMG/AMG150 1 Port Series Datasheet D33646-05.pdf",
    "image": "assets/images/products/amg-150-1gat-p30.webp"
  },
  "amg150-1gbt-p90": {
    "datasheetPath": "Datasheets/Network/AMG/AMG150 1 Port Series Datasheet D33646-05.pdf",
    "image": "assets/images/products/amg-150-1gat-p30.webp"
  },
  "amg150-1gbt-p90-lv": {
    "datasheetPath": "Datasheets/Network/AMG/AMG150 1 Port LV Series Datasheet D33647-04.pdf",
    "image": "assets/images/products/amg-150-1gbt-p90-lv.webp"
  },
  "amg150-1xbt-p90": {
    "datasheetPath": "Datasheets/Network/AMG/AMG150 1 Port Series Datasheet D33646-05.pdf",
    "image": "assets/images/products/amg-150-1gat-p30.webp"
  },
  "amg150-2gbt-p180": {
    "datasheetPath": "Datasheets/Network/AMG/AMG150 2 Port Series Datasheet D33051-08.pdf",
    "image": "assets/images/products/amg-150-2gbt-p180.webp"
  },
  "amg150-4gat-p120": {
    "datasheetPath": "Datasheets/Network/AMG/AMG150 4_6 Port Series Datasheet D33393-03.pdf",
    "image": "assets/images/products/amg-150-4gat-p120.webp"
  },
  "amg150-8gat-p240": {
    "datasheetPath": "Datasheets/Network/AMG/AMG150 8 Port Series Datasheet D33619-03.pdf",
    "image": "assets/images/products/amg-150-8gat-p240.webp"
  },
  "amg155-1gat-p30": {
    "datasheetPath": "Datasheets/Network/AMG/AMG155 1 Port Series Datasheet D33648-08.pdf",
    "image": "assets/images/products/amg-155-1gat-p30.webp"
  },
  "amg156-1gbt-p90": {
    "datasheetPath": "Datasheets/Network/AMG/AMG156 8_16_24 Series Datasheet D33394-03.pdf",
    "image": "assets/images/products/amg-156-1gbt-p90.webp"
  },
  "amg160-1f-1ec": {
    "datasheetPath": "Datasheets/Network/AMG/AMG160-1F-1EC Datasheet D37139-04.pdf",
    "image": "assets/images/products/amg-160-1f-1ec.webp"
  },
  "amg172-1g-1v": {
    "datasheetPath": "Datasheets/Network/AMG/AMG172 Series Datasheet D39111-10.pdf",
    "image": "assets/images/products/amg-172-1g-1v.webp"
  },
  "amg2015-dr": {
    "datasheetPath": "Datasheets/Network/AMG/AMG2015-DR 3U Rack Datasheet D18966-02.pdf",
    "image": "assets/images/products/amg-2015-dr.webp"
  },
  "amg2031": {
    "datasheetPath": "Datasheets/Network/AMG/AMG2031 1U Rack Datasheet D33276-01.pdf",
    "image": "assets/images/products/amg-2031.webp"
  },
  "amg2035": {
    "datasheetPath": "Datasheets/Network/AMG/AMG2035 90 Degree Bracket Datasheet D39283-01.pdf",
    "image": "assets/images/products/amg-2035.webp"
  },
  "amg2036-rp-aa": {
    "datasheetPath": "Datasheets/Network/AMG/AMG2036 Blade Chassis Datasheet D33818-03.pdf",
    "image": "assets/images/products/amg-2036-rp-aa.webp"
  },
  "amg210m-1g-1s": {
    "datasheetPath": "Datasheets/Network/AMG/AMG210C Media Converter Rack Datasheet D39120-07.pdf",
    "image": "assets/images/products/amg-210m-1g-1s.webp"
  },
  "amg250-1g-1s": {
    "datasheetPath": "Datasheets/Network/AMG/AMG250 Series Datasheet D33031-08.pdf",
    "image": "assets/images/products/amg-250-1g-1s.webp"
  },
  "amg250-1gat-1s-p30": {
    "datasheetPath": "Datasheets/Network/AMG/AMG250 Series Datasheet D33031-08.pdf",
    "image": "assets/images/products/amg-250-1g-1s.webp"
  },
  "amg250-1gbt-1s-p90": {
    "datasheetPath": "Datasheets/Network/AMG/AMG250 Series Datasheet D33031-08.pdf",
    "image": "assets/images/products/amg-250-1g-1s.webp"
  },
  "amg250-1xbt-1xs-p90": {
    "datasheetPath": "Datasheets/Network/AMG/AMG250 10G Series Datasheet D33797-01.pdf",
    "image": "assets/images/products/amg-250-1xbt-1xs.webp"
  },
  "amg250r-1g-1s": {
    "datasheetPath": "Datasheets/Network/AMG/AMG250R Series Datasheet D33036-07.pdf",
    "image": "assets/images/products/amg-250r-1g-1s.webp"
  },
  "amg250r-4g-4s": {
    "datasheetPath": "Datasheets/Network/AMG/AMG250R Series Datasheet D33036-07.pdf",
    "image": "assets/images/products/amg-250r-1g-1s.webp"
  },
  "amg255-2gbt-1s-p120": {
    "datasheetPath": "Datasheets/Network/AMG/AMG255 120W Series Datasheet D33467-03.pdf",
    "image": "assets/images/products/amg-255-2gbt-1s.webp"
  },
  "amg260m-1g-1s": {
    "datasheetPath": "Datasheets/Network/AMG/AMG210C Media Converter Rack Datasheet D39120-07.pdf",
    "image": "assets/images/products/amg-210m-1g-1s.webp"
  },
  "amg260m-1gbt-1s-p90": {
    "datasheetPath": "Datasheets/Network/AMG/AMG210C Media Converter Rack Datasheet D39120-07.pdf",
    "image": "assets/images/products/amg-210m-1g-1s.webp"
  },
  "amg265m-1g-1s": {
    "datasheetPath": "Datasheets/Network/AMG/AMG210C Media Converter Rack Datasheet D39120-07.pdf",
    "image": "assets/images/products/amg-210m-1g-1s.webp"
  },
  "amg350-14gat-2s-p300": {
    "datasheetPath": "Datasheets/Network/AMG/AMG350-14GAT-2S-P300 Datasheet D33751-02.pdf",
    "image": "assets/images/products/amg-350-14gat-2s.webp"
  },
  "amg350-2g-2s": {
    "datasheetPath": "Datasheets/Network/AMG/AMG350-2G-2S Series Datasheet D33052-08.pdf",
    "image": "assets/images/products/amg-350-2g-2s.webp"
  },
  "amg350-2gat-2s-p60": {
    "datasheetPath": "Datasheets/Network/AMG/AMG350-2G-2S Series Datasheet D33052-08.pdf",
    "image": "assets/images/products/amg-350-2g-2s.webp"
  },
  "amg350-2gbt-2s-p180": {
    "datasheetPath": "Datasheets/Network/AMG/AMG350-2G-2S Series Datasheet D33052-08.pdf",
    "image": "assets/images/products/amg-350-2g-2s.webp"
  },
  "amg350-4g-1c-1s": {
    "datasheetPath": "Datasheets/Network/AMG/AMG350-4G-1C-1S Series Datasheet D33397-03.pdf",
    "image": "assets/images/products/amg-350-4g-1c-1s.webp"
  },
  "amg350-4gat-1c-1s-p120": {
    "datasheetPath": "Datasheets/Network/AMG/AMG350-4G-1C-1S Series Datasheet D33397-03.pdf",
    "image": "assets/images/products/amg-350-4g-1c-1s.webp"
  },
  "amg350-4gat-1g-p75-pd": {
    "datasheetPath": "Datasheets/Network/AMG/AMG350-4GAT-1G-P75-PD Datasheet D33641-01.pdf",
    "image": "assets/images/products/amg-350-4gat-1g-pd.webp"
  },
  "amg350-4gbt-1c-1s-p240": {
    "datasheetPath": "Datasheets/Network/AMG/AMG350-4G-1C-1S Series Datasheet D33397-03.pdf",
    "image": "assets/images/products/amg-350-4g-1c-1s.webp"
  },
  "amg350-5g": {
    "datasheetPath": "Datasheets/Network/AMG/AMG350-5G Series Datasheet D33403-03.pdf",
    "image": "assets/images/products/amg-350-5g.webp"
  },
  "amg350-8g": {
    "datasheetPath": "Datasheets/Network/AMG/AMG350-8G Series Datasheet D33404-01.pdf",
    "image": "assets/images/products/amg-350-8g.webp"
  },
  "amg350-8gat-2s-p240": {
    "datasheetPath": "Datasheets/Network/AMG/AMG350-8G Series Datasheet D33404-01.pdf",
    "image": "assets/images/products/amg-350-8g.webp"
  },
  "amg350-8gat-p200": {
    "datasheetPath": "Datasheets/Network/AMG/AMG350-8G Series Datasheet D33404-01.pdf",
    "image": "assets/images/products/amg-350-8g.webp"
  },
  "amg510-16gat-2c-p290": {
    "datasheetPath": "Datasheets/Network/AMG/AMG510-16G Series Datasheet D39131-06.pdf",
    "image": "assets/images/products/amg-510-16gat-2c.webp"
  },
  "amg510-22gat-2cat-2s-p460": {
    "datasheetPath": "Datasheets/Network/AMG/AMG510-24G RP Series Datasheet D39150-05.pdf",
    "image": "assets/images/products/amg-510-24g-4xs.webp"
  },
  "amg510-24g-4xs": {
    "datasheetPath": "Datasheets/Network/AMG/AMG510-24G RP Series Datasheet D39150-05.pdf",
    "image": "assets/images/products/amg-510-24g-4xs.webp"
  },
  "amg510-24gat-4xs-p460": {
    "datasheetPath": "Datasheets/Network/AMG/AMG510-24G RP Series Datasheet D39150-05.pdf",
    "image": "assets/images/products/amg-510-24g-4xs.webp"
  },
  "amg510-24gat-4xs-rp540": {
    "datasheetPath": "Datasheets/Network/AMG/AMG510-24G RP Series Datasheet D39150-05.pdf",
    "image": "assets/images/products/amg-510-24g-4xs.webp"
  },
  "amg510-48gat-4xs-p860": {
    "datasheetPath": "Datasheets/Network/AMG/AMG510-48G Series Datasheet D39133-06.pdf",
    "image": "assets/images/products/amg-510-48gat-4xs.webp"
  },
  "amg510-4g-24s-4xs": {
    "datasheetPath": "Datasheets/Network/AMG/AMG510-24G RP Series Datasheet D39150-05.pdf",
    "image": "assets/images/products/amg-510-24g-4xs.webp"
  },
  "amg510-8g-2s": {
    "datasheetPath": "Datasheets/Network/AMG/AMG510-8G Series Datasheet D39130-03.pdf",
    "image": "assets/images/products/amg-510-8g-2s.webp"
  },
  "amg510-8gat-2s-p210": {
    "datasheetPath": "Datasheets/Network/AMG/AMG510-8G Series Datasheet D39130-03.pdf",
    "image": "assets/images/products/amg-510-8g-2s.webp"
  },
  "amg510-8gbt-16gat-4xs-p460": {
    "datasheetPath": "Datasheets/Network/AMG/AMG510-16G Series Datasheet D39131-06.pdf",
    "image": "assets/images/products/amg-510-16gat-2c.webp"
  },
  "amg560-24gat-4s-rp300-ad": {
    "datasheetPath": "Datasheets/Network/AMG/AMG560-24G Series Datasheet D39136-01.pdf",
    "image": "assets/images/products/amg-560-24gat-4xs.webp"
  },
  "amg560-24gat-4xs-p300": {
    "datasheetPath": "Datasheets/Network/AMG/AMG560-24G Series Datasheet D39136-01.pdf",
    "image": "assets/images/products/amg-560-24gat-4xs.webp"
  },
  "amg560-8g-12s": {
    "datasheetPath": "Datasheets/Network/AMG/AMG560-8G Series Datasheet D39245-04.pdf",
    "image": "assets/images/products/amg-560-8g-4s.webp"
  },
  "amg560-8g-4s": {
    "datasheetPath": "Datasheets/Network/AMG/AMG560-8G Series Datasheet D39245-04.pdf",
    "image": "assets/images/products/amg-560-8g-4s.webp"
  },
  "amg560-8g-8s-4xs": {
    "datasheetPath": "Datasheets/Network/AMG/AMG560-8G Series Datasheet D39245-04.pdf",
    "image": "assets/images/products/amg-560-8g-4s.webp"
  },
  "amg560-8gat-4s-p240": {
    "datasheetPath": "Datasheets/Network/AMG/AMG560-8G Series Datasheet D39245-04.pdf",
    "image": "assets/images/products/amg-560-8g-4s.webp"
  },
  "amg560-8gat-4xs-p240": {
    "datasheetPath": "Datasheets/Network/AMG/AMG560-8G Series Datasheet D39245-04.pdf",
    "image": "assets/images/products/amg-560-8g-4s.webp"
  },
  "amg570-12gat-4s-p360": {
    "datasheetPath": "Datasheets/Network/AMG/AMG570 12-16 Port Series Datasheet D36352-05.pdf",
    "image": "assets/images/products/amg-570-8gat-4s.webp"
  },
  "amg570-16gat-8s-p360": {
    "datasheetPath": "Datasheets/Network/AMG/AMG570 16-24 Port Series Datasheet D36353-06.pdf",
    "image": "assets/images/products/amg-570-16gat-8s.webp"
  },
  "amg570-2gbt-10gat-4s-p360": {
    "datasheetPath": "Datasheets/Network/AMG/AMG570 6 Port Series Datasheet D36098-13.pdf",
    "image": "assets/images/products/amg-570-4g-2s.webp"
  },
  "amg570-2gbt-2gat-2s-p240": {
    "datasheetPath": "Datasheets/Network/AMG/AMG570 6 Port Series Datasheet D36098-13.pdf",
    "image": "assets/images/products/amg-570-4g-2s.webp"
  },
  "amg570-2gbt-4gat-2g-3s-p300": {
    "datasheetPath": "Datasheets/Network/AMG/AMG570 6 Port Series Datasheet D36098-13.pdf",
    "image": "assets/images/products/amg-570-4g-2s.webp"
  },
  "amg570-4g-2s": {
    "datasheetPath": "Datasheets/Network/AMG/AMG570 6 Port Series Datasheet D36098-13.pdf",
    "image": "assets/images/products/amg-570-4g-2s.webp"
  },
  "amg570-4gat-2s-p120": {
    "datasheetPath": "Datasheets/Network/AMG/AMG570 6 Port Series Datasheet D36098-13.pdf",
    "image": "assets/images/products/amg-570-4g-2s.webp"
  },
  "amg570-4gat-2s-p120-k": {
    "datasheetPath": "Datasheets/Network/AMG/AMG570-4G-2S-K Series Datasheet D36307-03.pdf",
    "image": "assets/images/products/amg-570-4g-2s.webp"
  },
  "amg570-4gbt-4g-3s-p360": {
    "datasheetPath": "Datasheets/Network/AMG/AMG570 6 Port Series Datasheet D36098-13.pdf",
    "image": "assets/images/products/amg-570-4g-2s.webp"
  },
  "amg570-4gbt-8gat-4g-8s-p360": {
    "datasheetPath": "Datasheets/Network/AMG/AMG570 11 Port Series Datasheet D36097-16.pdf",
    "image": "assets/images/products/amg-570-8g-3s.webp"
  },
  "amg570-8g-3s": {
    "datasheetPath": "Datasheets/Network/AMG/AMG570 11 Port Series Datasheet D36097-16.pdf",
    "image": "assets/images/products/amg-570-8g-3s.webp"
  },
  "amg570-8gat-3s-p240": {
    "datasheetPath": "Datasheets/Network/AMG/AMG570 11 Port Series Datasheet D36097-16.pdf",
    "image": "assets/images/products/amg-570-8g-3s.webp"
  },
  "amg570-8gat-3s-p240-k": {
    "datasheetPath": "Datasheets/Network/AMG/AMG570-8G-3S-K Series Datasheet D36306-03.pdf",
    "image": "assets/images/products/amg-570-8g-3s.webp"
  },
  "amg570-8gat-3s-p240-lv": {
    "datasheetPath": "Datasheets/Network/AMG/AMG570 11 Port LV Series Datasheet D36304-06.pdf",
    "image": "assets/images/products/amg-570-8gat-3s-lv.webp"
  },
  "amg570-8gat-4s-p240": {
    "datasheetPath": "Datasheets/Network/AMG/AMG570 12-16 Port Series Datasheet D36352-05.pdf",
    "image": "assets/images/products/amg-570-8gat-4s.webp"
  },
  "amg570-8gbt-4s-p720": {
    "datasheetPath": "Datasheets/Network/AMG/AMG570 12-16 Port Series Datasheet D36352-05.pdf",
    "image": "assets/images/products/amg-570-8gat-4s.webp"
  },
  "amg7111-1s-1c": {
    "datasheetPath": "Datasheets/Network/AMG/AMG140-1GR Series Datasheet D37287-01.pdf",
    "image": "assets/images/products/amg-350-4g-1c-1s.webp"
  },
  "amg750-1g-4gat-104-p120": {
    "datasheetPath": "Datasheets/Network/AMG/AMG750 Series Datasheet D39110-10.pdf",
    "image": "assets/images/products/amg-eoc-7501.webp"
  },
  "amg7501-1c-1e": {
    "datasheetPath": "Datasheets/Network/AMG/AMG750 Series Datasheet D39110-10.pdf",
    "image": "assets/images/products/amg-eoc-7501.webp"
  },
  "amg816-1f-rp-ad": {
    "datasheetPath": "Datasheets/Network/AMG/AMG816 Series Datasheet D35161-02.pdf",
    "image": "assets/images/products/amg-816-1f-rp-ad.webp"
  },
  "amg840-6n-4xs-rp": {
    "datasheetPath": "Datasheets/Network/AMG/AMG840 Series Datasheet D35264-01.pdf",
    "image": "assets/images/products/amg-840-6n-4xs.webp"
  },
  "amgmnt-mag-04": {
    "datasheetPath": "Datasheets/Network/AMG/AMGMNT-MAG Series Datasheet D39361-00.pdf",
    "image": "assets/images/products/amg-mnt-mag-04.webp"
  },
  "apc-netshelter-42u": {
    "datasheetPath": null,
    "image": null
  },
  "apc-smt1500rm2uc": {
    "datasheetPath": null,
    "image": null
  },
  "apc-smx3000rmlv2unc": {
    "datasheetPath": null,
    "image": null
  },
  "ar3100": {
    "datasheetPath": null,
    "image": null
  },
  "at-ar2050v-10": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-ar4050s-5g-ds.pdf",
    "image": "assets/images/products/at-ar2050v-10.webp"
  },
  "at-ar3050s-10": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-ar4050s-5g-ds.pdf",
    "image": "assets/images/products/at-ar2050v-10.webp"
  },
  "at-ar4050s-10": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-ar4050s-5g-ds.pdf",
    "image": "assets/images/products/at-ar2050v-10.webp"
  },
  "at-ar4050s-5g-10": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-ar4050s-5g-ds.pdf",
    "image": "assets/images/products/at-ar2050v-10.webp"
  },
  "at-gs980em-10h": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-gs980em-series-ds.pdf",
    "image": "assets/images/products/at-gs980em-10h.webp"
  },
  "at-gs980em-11pt": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-gs980em-series-ds.pdf",
    "image": "assets/images/products/at-gs980em-10h.webp"
  },
  "at-gs980em/10h": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-gs980em-series-ds.pdf",
    "image": "assets/images/products/at-gs980em-10h.webp"
  },
  "at-gs980em/11pt": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-gs980em-series-ds.pdf",
    "image": "assets/images/products/at-gs980em-10h.webp"
  },
  "at-gs980mx-10hsm": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-g980mx-series-ds.pdf",
    "image": "assets/images/products/at-x530l-10ghxm.webp"
  },
  "at-gs980mx-18hsm": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-g980mx-series-ds.pdf",
    "image": "assets/images/products/at-x530l-10ghxm.webp"
  },
  "at-gs980mx-28psm": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-g980mx-series-ds.pdf",
    "image": "assets/images/products/at-x530-28gpx.webp"
  },
  "at-gs980mx-52psm": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-g980mx-series-ds.pdf",
    "image": "assets/images/products/at-x530-52gpx.webp"
  },
  "at-gs980mx/10hsm": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-g980mx-series-ds.pdf",
    "image": "assets/images/products/at-x530l-10ghxm.webp"
  },
  "at-gs980mx/18hsm": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-g980mx-series-ds.pdf",
    "image": "assets/images/products/at-x530l-10ghxm.webp"
  },
  "at-gs980mx/28psm": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-g980mx-series-ds.pdf",
    "image": "assets/images/products/at-x530-28gpx.webp"
  },
  "at-gs980mx/52psm": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-g980mx-series-ds.pdf",
    "image": "assets/images/products/at-x530-52gpx.webp"
  },
  "at-ie220-10ghx": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-ie220-series-ds.pdf",
    "image": "assets/images/products/at-ie220-10ghx.webp"
  },
  "at-ie220-6ghx": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-ie220-series-ds.pdf",
    "image": "assets/images/products/at-ie220-6ghx.webp"
  },
  "at-ie340-12gp": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-ie340series-ds.pdf",
    "image": "assets/images/products/at-ie340-12gp.webp"
  },
  "at-ie340-12gt": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-ie340series-ds.pdf",
    "image": "assets/images/products/at-ie340-12gp.webp"
  },
  "at-ie340-18gp": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-ie340series-ds.pdf",
    "image": "assets/images/products/at-ie340-12gp.webp"
  },
  "at-ie340-20gp": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-ie340series-ds.pdf",
    "image": "assets/images/products/at-ie340-20gp.webp"
  },
  "at-ie360-12": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-ie340series-ds.pdf",
    "image": "assets/images/products/at-ie360-12.webp"
  },
  "at-ie560-12gsx": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-ie340series-ds.pdf",
    "image": "assets/images/products/at-ie560-12gsx.webp"
  },
  "at-x230-10gp": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-x230series-ds.pdf",
    "image": "assets/images/products/at-x230-10gp.webp"
  },
  "at-x230-10gt": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-x230series-ds.pdf",
    "image": "assets/images/products/at-x230-10gp.webp"
  },
  "at-x230-18gp": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-x230series-ds.pdf",
    "image": "assets/images/products/at-x230-10gp.webp"
  },
  "at-x230-18gt": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-x230series-ds.pdf",
    "image": "assets/images/products/at-x230-10gp.webp"
  },
  "at-x230-28gp": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-x230series-ds.pdf",
    "image": "assets/images/products/at-x230-28gp.webp"
  },
  "at-x230-28gt": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-x230series-ds.pdf",
    "image": "assets/images/products/at-x230-28gp.webp"
  },
  "at-x530-28gpx": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-x530series-ds.pdf",
    "image": "assets/images/products/at-x530-28gpx.webp"
  },
  "at-x530-28gpxm": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-x530series-ds.pdf",
    "image": "assets/images/products/at-x530-28gpx.webp"
  },
  "at-x530-28gtxm": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-x530series-ds.pdf",
    "image": "assets/images/products/at-x530-28gpx.webp"
  },
  "at-x530-28spxx": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-x530series-ds.pdf",
    "image": "assets/images/products/at-x550-18xsq.webp"
  },
  "at-x530-52gpx": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-x530series-ds.pdf",
    "image": "assets/images/products/at-x530-52gpx.webp"
  },
  "at-x530-52gpxm": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-x530series-ds.pdf",
    "image": "assets/images/products/at-x530-52gpx.webp"
  },
  "at-x530-52gtxm": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-x530series-ds.pdf",
    "image": "assets/images/products/at-x530-52gpx.webp"
  },
  "at-x530dp-28ghxm": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-x530series-ds.pdf",
    "image": "assets/images/products/at-x530-28gpx.webp"
  },
  "at-x530dp-52ghxm": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-x530series-ds.pdf",
    "image": "assets/images/products/at-x530-52gpx.webp"
  },
  "at-x530l-10ghxm": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-x530l-series-ds.pdf",
    "image": "assets/images/products/at-x530l-10ghxm.webp"
  },
  "at-x530l-18ghxm": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-x530l-series-ds.pdf",
    "image": "assets/images/products/at-x530l-10ghxm.webp"
  },
  "at-x530l-28gpx": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-x530l-series-ds.pdf",
    "image": "assets/images/products/at-x530-28gpx.webp"
  },
  "at-x530l-28gtx": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-x530l-series-ds.pdf",
    "image": "assets/images/products/at-x530-28gpx.webp"
  },
  "at-x530l-52gpx": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-x530l-series-ds.pdf",
    "image": "assets/images/products/at-x530-52gpx.webp"
  },
  "at-x530l-52gtx": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-x530l-series-ds.pdf",
    "image": "assets/images/products/at-x530-52gpx.webp"
  },
  "at-x550-18xsq": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-x550series-ds.pdf",
    "image": "assets/images/products/at-x550-18xsq.webp"
  },
  "at-x560-28ysq": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-x550series-ds.pdf",
    "image": "assets/images/products/at-x550-18xsq.webp"
  },
  "at-x930-28gpx": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-x930series-ds.pdf",
    "image": "assets/images/products/at-x930-28gpx.webp"
  },
  "at-x930-28gstx": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-x930series-ds.pdf",
    "image": "assets/images/products/at-x930-28gpx.webp"
  },
  "at-x930-28gtx": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-x930series-ds.pdf",
    "image": "assets/images/products/at-x930-28gpx.webp"
  },
  "at-x930-52gpx": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-x930series-ds.pdf",
    "image": "assets/images/products/at-x930-52gpx.webp"
  },
  "at-x930-52gtx": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-x930series-ds.pdf",
    "image": "assets/images/products/at-x930-52gpx.webp"
  },
  "at-x950-28xsq": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-x950series-ds.pdf",
    "image": "assets/images/products/at-x950-28xsq.webp"
  },
  "at-x950-28xtqm": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-x950series-ds.pdf",
    "image": "assets/images/products/at-x950-28xtqm.webp"
  },
  "at-x950-52xsq": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-x950series-ds.pdf",
    "image": "assets/images/products/at-x950-52xsq.webp"
  },
  "at-x950-52xtqm": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-x950series-ds.pdf",
    "image": "assets/images/products/at-x950-52xsq.webp"
  },
  "at-x980-32cq": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-x980-series-ds.pdf",
    "image": "assets/images/products/at-x980-32cq.webp"
  },
  "at-x980-32dq": {
    "datasheetPath": "Datasheets/Network/Allied Telesis/ati-x980-series-ds.pdf",
    "image": "assets/images/products/at-x980-32cq.webp"
  },
  "c060084a001a": {
    "datasheetPath": null,
    "image": null
  },
  "c060084a004a": {
    "datasheetPath": null,
    "image": null
  },
  "c9200l-24p-4g-m": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Catalyst 9200L-M Datasheet.pdf",
    "image": "assets/images/products/cisco-c9200l-24p-4g-m.webp"
  },
  "c9200l-24p-4x-m": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Catalyst 9200L-M Datasheet.pdf",
    "image": "assets/images/products/cisco-c9200l-24p-4g-m.webp"
  },
  "c9200l-24pxg-4x-m": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Catalyst 9200L-M Datasheet.pdf",
    "image": "assets/images/products/cisco-c9200l-24p-4g-m.webp"
  },
  "c9200l-48p-4g-m": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Catalyst 9200L-M Datasheet.pdf",
    "image": "assets/images/products/cisco-c9200l-48p-4g-m.webp"
  },
  "c9200l-48p-4x-m": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Catalyst 9200L-M Datasheet.pdf",
    "image": "assets/images/products/cisco-c9200l-48p-4g-m.webp"
  },
  "c9200l-48pxg-4x-m": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Catalyst 9200L-M Datasheet.pdf",
    "image": "assets/images/products/cisco-c9200l-48pxg-4x-m.webp"
  },
  "c9300-24p-m": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Catalyst 9300-M Datasheet.pdf",
    "image": "assets/images/products/cisco-c9300-24p-m.webp"
  },
  "c9300-24s-m": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Catalyst 9300-M Datasheet.pdf",
    "image": "assets/images/products/cisco-c9300-24p-m.webp"
  },
  "c9300-24u-m": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Catalyst 9300-M Datasheet.pdf",
    "image": "assets/images/products/cisco-c9300-24p-m.webp"
  },
  "c9300-24ux-m": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Catalyst 9300-M Datasheet.pdf",
    "image": "assets/images/products/cisco-c9300-24p-m.webp"
  },
  "c9300-48p-m": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Catalyst 9300-M Datasheet.pdf",
    "image": "assets/images/products/cisco-c9300-48p-m.webp"
  },
  "c9300-48s-m": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Catalyst 9300-M Datasheet.pdf",
    "image": "assets/images/products/cisco-c9300-48p-m.webp"
  },
  "c9300-48u-m": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Catalyst 9300-M Datasheet.pdf",
    "image": "assets/images/products/cisco-c9300-48p-m.webp"
  },
  "c9300-48un-m": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Catalyst 9300-M Datasheet.pdf",
    "image": "assets/images/products/cisco-c9300-48p-m.webp"
  },
  "c9300-48uxm-m": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Catalyst 9300-M Datasheet.pdf",
    "image": "assets/images/products/cisco-c9300-48p-m.webp"
  },
  "c9300l-24p-4x-m": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Catalyst 9300L-M Datasheet.pdf",
    "image": "assets/images/products/cisco-c9300l-24p-4x-m.webp"
  },
  "c9300l-24uxg-4x-m": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Catalyst 9300L-M Datasheet.pdf",
    "image": "assets/images/products/cisco-c9300l-24p-4x-m.webp"
  },
  "c9300l-48p-4x-m": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Catalyst 9300L-M Datasheet.pdf",
    "image": "assets/images/products/cisco-c9300l-48p-4x-m.webp"
  },
  "c9300l-48pf-4x-m": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Catalyst 9300L-M Datasheet.pdf",
    "image": "assets/images/products/cisco-c9300l-48p-4x-m.webp"
  },
  "c9300l-48uxg-4x-m": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Catalyst 9300L-M Datasheet.pdf",
    "image": "assets/images/products/cisco-c9300l-48p-4x-m.webp"
  },
  "c9300lm-24u-4y-m": {
    "datasheetPath": "Datasheets/Network/Cisco/cisco-meraki_datasheet_ms_family.pdf",
    "image": "assets/images/products/cisco-c9300lm-24u-4y-m.webp"
  },
  "c9300lm-48ux-4y-m": {
    "datasheetPath": "Datasheets/Network/Cisco/cisco-meraki_datasheet_ms_family.pdf",
    "image": "assets/images/products/cisco-c9300lm-24u-4y-m.webp"
  },
  "c9300x-12y-m": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Catalyst 9300X-M Datasheet.pdf",
    "image": "assets/images/products/cisco-c9300x-12y-m.webp"
  },
  "c9300x-24hx-m": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Catalyst 9300X-M Datasheet.pdf",
    "image": "assets/images/products/cisco-c9300x-24hx-m.webp"
  },
  "c9300x-24y-m": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Catalyst 9300X-M Datasheet.pdf",
    "image": "assets/images/products/cisco-c9300x-12y-m.webp"
  },
  "c9300x-48hx-m": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Catalyst 9300X-M Datasheet.pdf",
    "image": "assets/images/products/cisco-c9300x-24hx-m.webp"
  },
  "c9300x-48hxn-m": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Catalyst 9300X-M Datasheet.pdf",
    "image": "assets/images/products/cisco-c9300x-24hx-m.webp"
  },
  "c9300x-48tx-m": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Catalyst 9300X-M Datasheet.pdf",
    "image": "assets/images/products/cisco-c9300x-24hx-m.webp"
  },
  "cablofil-cf54-300": {
    "datasheetPath": null,
    "image": null
  },
  "cambium-cnwave-v1000": {
    "datasheetPath": "Datasheets/Network/Cambium/Cambium cnWave 60 GHz V1000 - Tech Specs.pdf",
    "image": "assets/images/products/cambium-cnwave-v1000.webp"
  },
  "cambium-cnwave-v3000": {
    "datasheetPath": "Datasheets/Network/Cambium/Cambium cnWave 60 GHz V3000 - Tech Specs.pdf",
    "image": "assets/images/products/cambium-cnwave-v3000.webp"
  },
  "cambium-cnwave-v5000": {
    "datasheetPath": "Datasheets/Network/Cambium/Cambium cnWave 60 GHz V5000 - Tech Specs.pdf",
    "image": "assets/images/products/cambium-cnwave-v5000.webp"
  },
  "cambium-epmp-force300": {
    "datasheetPath": "Datasheets/Network/Cambium/Cambium ePMP Force 300-25 - Tech Specs.pdf",
    "image": "assets/images/products/cambium-epmp-force300.webp"
  },
  "cat21hp": {
    "datasheetPath": null,
    "image": null
  },
  "cat32hpbc200": {
    "datasheetPath": null,
    "image": null
  },
  "cat64hp": {
    "datasheetPath": null,
    "image": null
  },
  "cf54-300-ez": {
    "datasheetPath": null,
    "image": null
  },
  "cisco-c9200l-24p-4g-m": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Catalyst 9200L-M Datasheet.pdf",
    "image": "assets/images/products/cisco-c9200l-24p-4g-m.webp"
  },
  "cisco-c9200l-24p-4x-m": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Catalyst 9200L-M Datasheet.pdf",
    "image": "assets/images/products/cisco-c9200l-24p-4g-m.webp"
  },
  "cisco-c9200l-24pxg-4x-m": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Catalyst 9200L-M Datasheet.pdf",
    "image": "assets/images/products/cisco-c9200l-24p-4g-m.webp"
  },
  "cisco-c9200l-48p-4g-m": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Catalyst 9200L-M Datasheet.pdf",
    "image": "assets/images/products/cisco-c9200l-48p-4g-m.webp"
  },
  "cisco-c9200l-48p-4x-m": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Catalyst 9200L-M Datasheet.pdf",
    "image": "assets/images/products/cisco-c9200l-48p-4g-m.webp"
  },
  "cisco-c9200l-48pxg-4x-m": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Catalyst 9200L-M Datasheet.pdf",
    "image": "assets/images/products/cisco-c9200l-48pxg-4x-m.webp"
  },
  "cisco-c9300-24p-m": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Catalyst 9300-M Datasheet.pdf",
    "image": "assets/images/products/cisco-c9300-24p-m.webp"
  },
  "cisco-c9300-24s-m": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Catalyst 9300-M Datasheet.pdf",
    "image": "assets/images/products/cisco-c9300-24p-m.webp"
  },
  "cisco-c9300-24u-m": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Catalyst 9300-M Datasheet.pdf",
    "image": "assets/images/products/cisco-c9300-24p-m.webp"
  },
  "cisco-c9300-24ux-m": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Catalyst 9300-M Datasheet.pdf",
    "image": "assets/images/products/cisco-c9300-24p-m.webp"
  },
  "cisco-c9300-48p-m": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Catalyst 9300-M Datasheet.pdf",
    "image": "assets/images/products/cisco-c9300-48p-m.webp"
  },
  "cisco-c9300-48s-m": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Catalyst 9300-M Datasheet.pdf",
    "image": "assets/images/products/cisco-c9300-48p-m.webp"
  },
  "cisco-c9300-48u-m": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Catalyst 9300-M Datasheet.pdf",
    "image": "assets/images/products/cisco-c9300-48p-m.webp"
  },
  "cisco-c9300-48un-m": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Catalyst 9300-M Datasheet.pdf",
    "image": "assets/images/products/cisco-c9300-48p-m.webp"
  },
  "cisco-c9300-48uxm-m": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Catalyst 9300-M Datasheet.pdf",
    "image": "assets/images/products/cisco-c9300-48p-m.webp"
  },
  "cisco-c9300l-24p-4x-m": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Catalyst 9300L-M Datasheet.pdf",
    "image": "assets/images/products/cisco-c9300l-24p-4x-m.webp"
  },
  "cisco-c9300l-24uxg-4x-m": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Catalyst 9300L-M Datasheet.pdf",
    "image": "assets/images/products/cisco-c9300l-24p-4x-m.webp"
  },
  "cisco-c9300l-48p-4x-m": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Catalyst 9300L-M Datasheet.pdf",
    "image": "assets/images/products/cisco-c9300l-48p-4x-m.webp"
  },
  "cisco-c9300l-48pf-4x-m": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Catalyst 9300L-M Datasheet.pdf",
    "image": "assets/images/products/cisco-c9300l-48p-4x-m.webp"
  },
  "cisco-c9300l-48uxg-4x-m": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Catalyst 9300L-M Datasheet.pdf",
    "image": "assets/images/products/cisco-c9300l-48p-4x-m.webp"
  },
  "cisco-c9300lm-24u-4y-m": {
    "datasheetPath": "Datasheets/Network/Cisco/cisco-meraki_datasheet_ms_family.pdf",
    "image": "assets/images/products/cisco-c9300lm-24u-4y-m.webp"
  },
  "cisco-c9300lm-48ux-4y-m": {
    "datasheetPath": "Datasheets/Network/Cisco/cisco-meraki_datasheet_ms_family.pdf",
    "image": "assets/images/products/cisco-c9300lm-24u-4y-m.webp"
  },
  "cisco-c9300x-12y-m": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Catalyst 9300X-M Datasheet.pdf",
    "image": "assets/images/products/cisco-c9300x-12y-m.webp"
  },
  "cisco-c9300x-24hx-m": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Catalyst 9300X-M Datasheet.pdf",
    "image": "assets/images/products/cisco-c9300x-24hx-m.webp"
  },
  "cisco-c9300x-24y-m": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Catalyst 9300X-M Datasheet.pdf",
    "image": "assets/images/products/cisco-c9300x-12y-m.webp"
  },
  "cisco-c9300x-48hx-m": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Catalyst 9300X-M Datasheet.pdf",
    "image": "assets/images/products/cisco-c9300x-24hx-m.webp"
  },
  "cisco-c9300x-48hxn-m": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Catalyst 9300X-M Datasheet.pdf",
    "image": "assets/images/products/cisco-c9300x-24hx-m.webp"
  },
  "cisco-c9300x-48tx-m": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Catalyst 9300X-M Datasheet.pdf",
    "image": "assets/images/products/cisco-c9300x-24hx-m.webp"
  },
  "cpi-55053-703": {
    "datasheetPath": null,
    "image": null
  },
  "cpi-rack-45u-2post": {
    "datasheetPath": null,
    "image": null
  },
  "dwr-18-26": {
    "datasheetPath": null,
    "image": null
  },
  "ecs-24-poe": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Enterprise Campus 24 PoE - Tech Specs.pdf",
    "image": "assets/images/products/unifi-ecs-24-poe.webp"
  },
  "ecs-24s": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Enterprise Campus 24S - Tech Specs.pdf",
    "image": "assets/images/products/unifi-ecs-24s.webp"
  },
  "ecs-24s-poe": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Enterprise Campus 24S PoE - Tech Specs.pdf",
    "image": "assets/images/products/unifi-ecs-24s-poe.webp"
  },
  "ecs-48-poe": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Enterprise Campus 48 PoE - Tech Specs.pdf",
    "image": "assets/images/products/unifi-ecs-48-poe.webp"
  },
  "ecs-48s": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Enterprise Campus 48S - Tech Specs.pdf",
    "image": "assets/images/products/unifi-ecs-48s.webp"
  },
  "ecs-48s-poe": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Enterprise Campus 48S PoE - Tech Specs.pdf",
    "image": "assets/images/products/unifi-ecs-48s-poe.webp"
  },
  "ecs-aggregation": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Enterprise Campus Aggregation - Tech Specs.pdf",
    "image": "assets/images/products/unifi-ecs-agg.webp"
  },
  "ecs-core": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Enterprise Campus Switch Core - Tech Specs.pdf",
    "image": "assets/images/products/unifi-ecs-core.webp"
  },
  "ef-core": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Enterprise Firewall Core - Tech Specs.pdf",
    "image": "assets/images/products/ef-core.webp"
  },
  "efg": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Enterprise Firewall - Tech Specs.pdf",
    "image": "assets/images/products/efg.webp"
  },
  "eh-8010fx-odu-h-ext": {
    "datasheetPath": null,
    "image": null
  },
  "erico-caddy-cat21hp": {
    "datasheetPath": null,
    "image": null
  },
  "erico-caddy-cat32hp-bat": {
    "datasheetPath": null,
    "image": null
  },
  "erico-caddy-cat64hp": {
    "datasheetPath": null,
    "image": null
  },
  "eth-sp-g2": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/Ubiquiti Ethernet Surge Protector Gen2 - Tech Specs.pdf",
    "image": "assets/images/products/ubnt_eth_sp_g2.webp"
  },
  "ex2300-24mp": {
    "datasheetPath": "Datasheets/Network/Juniper/ex2300-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex2300-24mp.webp"
  },
  "ex2300-24p": {
    "datasheetPath": "Datasheets/Network/Juniper/ex2300-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex2300-24p.webp"
  },
  "ex2300-24t": {
    "datasheetPath": "Datasheets/Network/Juniper/ex2300-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex2300-24p.webp"
  },
  "ex2300-48mp": {
    "datasheetPath": "Datasheets/Network/Juniper/ex2300-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex2300-48mp.webp"
  },
  "ex2300-48p": {
    "datasheetPath": "Datasheets/Network/Juniper/ex2300-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex2300-48p.webp"
  },
  "ex2300-48t": {
    "datasheetPath": "Datasheets/Network/Juniper/ex2300-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex2300-48p.webp"
  },
  "ex2300-c-12p": {
    "datasheetPath": "Datasheets/Network/Juniper/ex2300-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex2300-c-12p.webp"
  },
  "ex2300-c-12t": {
    "datasheetPath": "Datasheets/Network/Juniper/ex2300-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex2300-c-12t.webp"
  },
  "ex3400-24p": {
    "datasheetPath": "Datasheets/Network/Juniper/ex3400-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex3400-24p.webp"
  },
  "ex3400-24t": {
    "datasheetPath": "Datasheets/Network/Juniper/ex3400-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex3400-24p.webp"
  },
  "ex3400-48p": {
    "datasheetPath": "Datasheets/Network/Juniper/ex3400-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex3400-48p.webp"
  },
  "ex3400-48t": {
    "datasheetPath": "Datasheets/Network/Juniper/ex3400-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex3400-48p.webp"
  },
  "ex4100-24mp": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4100-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex4100-24mp.webp"
  },
  "ex4100-24p": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4100-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex4100-24p.webp"
  },
  "ex4100-24t": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4100-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex4100-24t.webp"
  },
  "ex4100-48mp": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4100-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex4100-48mp.webp"
  },
  "ex4100-48p": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4100-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex4100-48p.webp"
  },
  "ex4100-48t": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4100-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex4100-48t.webp"
  },
  "ex4100-f-12p": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4100-f-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex4100-f-12p.webp"
  },
  "ex4100-f-12t": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4100-f-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex4100-f-12t.webp"
  },
  "ex4100-f-24p": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4100-f-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex4100-f-24p.webp"
  },
  "ex4100-f-24t": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4100-f-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex4100-f-24t.webp"
  },
  "ex4100-f-48p": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4100-f-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex4100-f-48p.webp"
  },
  "ex4100-f-48t": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4100-f-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex4100-f-48t.webp"
  },
  "ex4100-h-12mp": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4100-h-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex4100-h-12t.webp"
  },
  "ex4100-h-12t": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4100-h-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex4100-h-12t.webp"
  },
  "ex4100-h-24mp": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4100-h-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex4100-h-24mp.webp"
  },
  "ex4300-24p": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4300-datasheet.pdf",
    "image": "assets/images/products/juniper-ex4300-24p.webp"
  },
  "ex4300-24t": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4300-datasheet.pdf",
    "image": "assets/images/products/juniper-ex4300-24p.webp"
  },
  "ex4300-32f": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4300-datasheet.pdf",
    "image": "assets/images/products/juniper-ex4300-32f.webp"
  },
  "ex4300-48mp": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4300-datasheet.pdf",
    "image": "assets/images/products/juniper-ex4300-48mp.webp"
  },
  "ex4300-48p": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4300-datasheet.pdf",
    "image": "assets/images/products/juniper-ex4300-48p.webp"
  },
  "ex4300-48t": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4300-datasheet.pdf",
    "image": "assets/images/products/juniper-ex4300-48p.webp"
  },
  "ex4400-24mp": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4400-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex4400-24mp.webp"
  },
  "ex4400-24p": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4400-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex4400-24p.webp"
  },
  "ex4400-24t": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4400-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex4400-24t.webp"
  },
  "ex4400-24x": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4400-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex4400-24x.webp"
  },
  "ex4400-48f": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4400-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex4400-48f.webp"
  },
  "ex4400-48mp": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4400-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex4400-48mp.webp"
  },
  "ex4400-48p": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4400-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex4400-48p.webp"
  },
  "ex4400-48t": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4400-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex4400-48t.webp"
  },
  "ex4600-40f": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4600-datasheet.pdf",
    "image": "assets/images/products/juniper-ex4600-40f.webp"
  },
  "ex4650-48y-afi": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4650-datasheet.pdf",
    "image": "assets/images/products/juniper-ex4650-48y.webp"
  },
  "fg-100f": {
    "datasheetPath": null,
    "image": null
  },
  "fg-200f": {
    "datasheetPath": null,
    "image": null
  },
  "fg-40f": {
    "datasheetPath": null,
    "image": null
  },
  "fg-60f": {
    "datasheetPath": null,
    "image": null
  },
  "fg-80f": {
    "datasheetPath": null,
    "image": null
  },
  "icx7150-24": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 7150 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 7150 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7150-24.webp",
    "photo": "assets/images/products/ruckus-icx7150-24.webp"
  },
  "icx7150-24p": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 7150 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 7150 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7150-24p.webp",
    "photo": "assets/images/products/ruckus-icx7150-24p.webp"
  },
  "icx7150-48": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 7150 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 7150 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7150-48.webp",
    "photo": "assets/images/products/ruckus-icx7150-48.webp"
  },
  "icx7150-48p": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 7150 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 7150 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7150-48p.webp",
    "photo": "assets/images/products/ruckus-icx7150-48p.webp"
  },
  "icx7150-48pf": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 7150 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 7150 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7150-48pf.webp",
    "photo": "assets/images/products/ruckus-icx7150-48pf.webp"
  },
  "icx7150-48zp": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 7150 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 7150 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7150-48zp.webp",
    "photo": "assets/images/products/ruckus-icx7150-48zp.webp"
  },
  "icx7150-c10zp": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 7150 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 7150 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7150-c10zp.webp",
    "photo": "assets/images/products/ruckus-icx7150-c10zp.webp"
  },
  "icx7150-c12p": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 7150 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 7150 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7150-c12p.webp",
    "photo": "assets/images/products/ruckus-icx7150-c12p.webp"
  },
  "icx7450-24": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX Switch Family Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX Switch Family Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7450-24.webp",
    "photo": "assets/images/products/ruckus-icx7450-24.webp"
  },
  "icx7450-24p": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX Switch Family Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX Switch Family Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7450-24p.webp",
    "photo": "assets/images/products/ruckus-icx7450-24p.webp"
  },
  "icx7450-48": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX Switch Family Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX Switch Family Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7450-48.webp",
    "photo": "assets/images/products/ruckus-icx7450-48.webp"
  },
  "icx7450-48f": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX Switch Family Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX Switch Family Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7450-48f.webp",
    "photo": "assets/images/products/ruckus-icx7450-48f.webp"
  },
  "icx7450-48p": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX Switch Family Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX Switch Family Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7450-48p.webp",
    "photo": "assets/images/products/ruckus-icx7450-48p.webp"
  },
  "icx7550-24": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 7550 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 7550 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7550-24.webp",
    "photo": "assets/images/products/ruckus-icx7550-24.webp"
  },
  "icx7550-24f": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 7550 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 7550 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7550-24f.webp",
    "photo": "assets/images/products/ruckus-icx7550-24f.webp"
  },
  "icx7550-24p": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 7550 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 7550 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7550-24p.webp",
    "photo": "assets/images/products/ruckus-icx7550-24p.webp"
  },
  "icx7550-24zp": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 7550 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 7550 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7550-24zp.webp",
    "photo": "assets/images/products/ruckus-icx7550-24zp.webp"
  },
  "icx7550-48": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 7550 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 7550 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7550-48.webp",
    "photo": "assets/images/products/ruckus-icx7550-48.webp"
  },
  "icx7550-48f": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 7550 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 7550 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7550-48f.webp",
    "photo": "assets/images/products/ruckus-icx7550-48f.webp"
  },
  "icx7550-48p": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 7550 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 7550 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7550-48p.webp",
    "photo": "assets/images/products/ruckus-icx7550-48p.webp"
  },
  "icx7550-48zp": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 7550 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 7550 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7550-48zp.webp",
    "photo": "assets/images/products/ruckus-icx7550-48zp.webp"
  },
  "icx7650-48f": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX Switch Family Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX Switch Family Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7650-48f.webp",
    "photo": "assets/images/products/ruckus-icx7650-48f.webp"
  },
  "icx7650-48p": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX Switch Family Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX Switch Family Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7650-48p.webp",
    "photo": "assets/images/products/ruckus-icx7650-48p.webp"
  },
  "icx7650-48zp": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX Switch Family Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX Switch Family Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7650-48zp.webp",
    "photo": "assets/images/products/ruckus-icx7650-48zp.webp"
  },
  "icx7750-26q": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX Switch Family Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX Switch Family Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7750-26q.webp",
    "photo": "assets/images/products/ruckus-icx7750-26q.webp"
  },
  "icx7750-48c": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX Switch Family Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX Switch Family Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7750-48c.webp",
    "photo": "assets/images/products/ruckus-icx7750-48c.webp"
  },
  "icx7750-48f": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX Switch Family Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX Switch Family Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7750-48f.webp",
    "photo": "assets/images/products/ruckus-icx7750-48f.webp"
  },
  "icx7850-32q": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 7850 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 7850 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7850-32q.webp",
    "photo": "assets/images/products/ruckus-icx7850-32q.webp"
  },
  "icx7850-48c": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 7850 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 7850 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7850-48c.webp",
    "photo": "assets/images/products/ruckus-icx7850-48c.webp"
  },
  "icx7850-48f": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 7850 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 7850 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7850-48f.webp",
    "photo": "assets/images/products/ruckus-icx7850-48f.webp"
  },
  "icx7850-48fs": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 7850 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 7850 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7850-48fs.webp",
    "photo": "assets/images/products/ruckus-icx7850-48fs.webp"
  },
  "icx8100-24": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 8100 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 8100 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx8100-24.webp",
    "photo": "assets/images/products/ruckus-icx8100-24.webp"
  },
  "icx8100-24p": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 8100 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 8100 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx8100-24p.webp",
    "photo": "assets/images/products/ruckus-icx8100-24p.webp"
  },
  "icx8100-48": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 8100 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 8100 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx8100-48.webp",
    "photo": "assets/images/products/ruckus-icx8100-48.webp"
  },
  "icx8100-48p": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 8100 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 8100 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx8100-48p.webp",
    "photo": "assets/images/products/ruckus-icx8100-48p.webp"
  },
  "icx8100-48pf": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 8100 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 8100 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx8100-48p.webp",
    "photo": "assets/images/products/ruckus-icx8100-48p.webp"
  },
  "icx8100-c08pf": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 8100 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 8100 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx8100-c08pf.webp",
    "photo": "assets/images/products/ruckus-icx8100-c08pf.webp"
  },
  "icx8100-c16p": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 8100 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 8100 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx8100-c16p.webp",
    "photo": "assets/images/products/ruckus-icx8100-c16p.webp"
  },
  "icx8200-24": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx8200-24.webp",
    "photo": "assets/images/products/ruckus-icx8200-24.webp"
  },
  "icx8200-24f": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx8200-24f.webp",
    "photo": "assets/images/products/ruckus-icx8200-24f.webp"
  },
  "icx8200-24fx": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx8200-24fx.webp",
    "photo": "assets/images/products/ruckus-icx8200-24fx.webp"
  },
  "icx8200-24p": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx8200-24p.webp",
    "photo": "assets/images/products/ruckus-icx8200-24p.webp"
  },
  "icx8200-24xp2": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx8200-24xp2.webp",
    "photo": "assets/images/products/ruckus-icx8200-24xp2.webp"
  },
  "icx8200-24zp": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx8200-24zp.webp",
    "photo": "assets/images/products/ruckus-icx8200-24zp.webp"
  },
  "icx8200-48": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx8200-48.webp",
    "photo": "assets/images/products/ruckus-icx8200-48.webp"
  },
  "icx8200-48f": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx8200-48f.webp",
    "photo": "assets/images/products/ruckus-icx8200-48f.webp"
  },
  "icx8200-48np2": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx8200-48np2.webp",
    "photo": "assets/images/products/ruckus-icx8200-48np2.webp"
  },
  "icx8200-48p": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx8200-48p.webp",
    "photo": "assets/images/products/ruckus-icx8200-48p.webp"
  },
  "icx8200-48pf": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx8200-48pf.webp",
    "photo": "assets/images/products/ruckus-icx8200-48pf.webp"
  },
  "icx8200-48pf2": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx8200-48pf2.webp",
    "photo": "assets/images/products/ruckus-icx8200-48pf2.webp"
  },
  "icx8200-48zp2": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx8200-48zp2.webp",
    "photo": "assets/images/products/ruckus-icx8200-48zp2.webp"
  },
  "icx8200-c08pf": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx8200-c08pf.webp",
    "photo": "assets/images/products/ruckus-icx8200-c08pf.webp"
  },
  "icx8200-c08zp": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx8200-c08zp.webp",
    "photo": "assets/images/products/ruckus-icx8200-c08zp.webp"
  },
  "juniper-ex2300-24mp": {
    "datasheetPath": "Datasheets/Network/Juniper/ex2300-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex2300-24mp.webp"
  },
  "juniper-ex2300-24p": {
    "datasheetPath": "Datasheets/Network/Juniper/ex2300-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex2300-24p.webp"
  },
  "juniper-ex2300-24t": {
    "datasheetPath": "Datasheets/Network/Juniper/ex2300-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex2300-24p.webp"
  },
  "juniper-ex2300-48mp": {
    "datasheetPath": "Datasheets/Network/Juniper/ex2300-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex2300-48mp.webp"
  },
  "juniper-ex2300-48p": {
    "datasheetPath": "Datasheets/Network/Juniper/ex2300-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex2300-48p.webp"
  },
  "juniper-ex2300-48t": {
    "datasheetPath": "Datasheets/Network/Juniper/ex2300-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex2300-48p.webp"
  },
  "juniper-ex2300-c-12p": {
    "datasheetPath": "Datasheets/Network/Juniper/ex2300-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex2300-c-12p.webp"
  },
  "juniper-ex2300-c-12t": {
    "datasheetPath": "Datasheets/Network/Juniper/ex2300-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex2300-c-12t.webp"
  },
  "juniper-ex3400-24p": {
    "datasheetPath": "Datasheets/Network/Juniper/ex3400-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex3400-24p.webp"
  },
  "juniper-ex3400-24t": {
    "datasheetPath": "Datasheets/Network/Juniper/ex3400-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex3400-24p.webp"
  },
  "juniper-ex3400-48p": {
    "datasheetPath": "Datasheets/Network/Juniper/ex3400-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex3400-48p.webp"
  },
  "juniper-ex3400-48t": {
    "datasheetPath": "Datasheets/Network/Juniper/ex3400-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex3400-48p.webp"
  },
  "juniper-ex4100-24mp": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4100-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex4100-24mp.webp"
  },
  "juniper-ex4100-24p": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4100-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex4100-24p.webp"
  },
  "juniper-ex4100-24t": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4100-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex4100-24t.webp"
  },
  "juniper-ex4100-48mp": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4100-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex4100-48mp.webp"
  },
  "juniper-ex4100-48p": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4100-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex4100-48p.webp"
  },
  "juniper-ex4100-48t": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4100-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex4100-48t.webp"
  },
  "juniper-ex4100-f-12p": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4100-f-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex4100-f-12p.webp"
  },
  "juniper-ex4100-f-12t": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4100-f-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex4100-f-12t.webp"
  },
  "juniper-ex4100-f-24p": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4100-f-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex4100-f-24p.webp"
  },
  "juniper-ex4100-f-24t": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4100-f-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex4100-f-24t.webp"
  },
  "juniper-ex4100-f-48p": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4100-f-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex4100-f-48p.webp"
  },
  "juniper-ex4100-f-48t": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4100-f-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex4100-f-48t.webp"
  },
  "juniper-ex4100-h-12mp": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4100-h-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex4100-h-12t.webp"
  },
  "juniper-ex4100-h-12t": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4100-h-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex4100-h-12t.webp"
  },
  "juniper-ex4100-h-24mp": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4100-h-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex4100-h-24mp.webp"
  },
  "juniper-ex4300-24p": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4300-datasheet.pdf",
    "image": "assets/images/products/juniper-ex4300-24p.webp"
  },
  "juniper-ex4300-24t": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4300-datasheet.pdf",
    "image": "assets/images/products/juniper-ex4300-24p.webp"
  },
  "juniper-ex4300-32f": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4300-datasheet.pdf",
    "image": "assets/images/products/juniper-ex4300-32f.webp"
  },
  "juniper-ex4300-48mp": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4300-datasheet.pdf",
    "image": "assets/images/products/juniper-ex4300-48mp.webp"
  },
  "juniper-ex4300-48p": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4300-datasheet.pdf",
    "image": "assets/images/products/juniper-ex4300-48p.webp"
  },
  "juniper-ex4300-48t": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4300-datasheet.pdf",
    "image": "assets/images/products/juniper-ex4300-48p.webp"
  },
  "juniper-ex4400-24mp": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4400-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex4400-24mp.webp"
  },
  "juniper-ex4400-24p": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4400-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex4400-24p.webp"
  },
  "juniper-ex4400-24t": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4400-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex4400-24t.webp"
  },
  "juniper-ex4400-24x": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4400-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex4400-24x.webp"
  },
  "juniper-ex4400-48f": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4400-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex4400-48f.webp"
  },
  "juniper-ex4400-48mp": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4400-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex4400-48mp.webp"
  },
  "juniper-ex4400-48p": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4400-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex4400-48p.webp"
  },
  "juniper-ex4400-48t": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4400-hardware-guide.pdf",
    "image": "assets/images/products/juniper-ex4400-48t.webp"
  },
  "juniper-ex4600-40f": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4600-datasheet.pdf",
    "image": "assets/images/products/juniper-ex4600-40f.webp"
  },
  "juniper-ex4650-48y": {
    "datasheetPath": "Datasheets/Network/Juniper/ex4650-datasheet.pdf",
    "image": "assets/images/products/juniper-ex4650-48y.webp"
  },
  "juniper-qfx5110-48s": {
    "datasheetPath": "Datasheets/Network/Juniper/qfx5110-hardware-guide.pdf",
    "image": "assets/images/products/juniper-qfx5110-48s.webp"
  },
  "juniper-qfx5120-32c": {
    "datasheetPath": "Datasheets/Network/Juniper/qfx5120-hardware-guide.pdf",
    "image": "assets/images/products/juniper-qfx5120-32c.webp"
  },
  "juniper-qfx5120-48t": {
    "datasheetPath": "Datasheets/Network/Juniper/qfx5120-hardware-guide.pdf",
    "image": "assets/images/products/juniper-qfx5120-48t.webp"
  },
  "juniper-qfx5120-48y": {
    "datasheetPath": "Datasheets/Network/Juniper/qfx5120-hardware-guide.pdf",
    "image": "assets/images/products/juniper-qfx5120-48y.webp"
  },
  "juniper-qfx5120-48ym": {
    "datasheetPath": "Datasheets/Network/Juniper/qfx5120-hardware-guide.pdf",
    "image": "assets/images/products/juniper-qfx5120-48ym.webp"
  },
  "juniper-qfx5200-32c": {
    "datasheetPath": "Datasheets/Network/Juniper/qfx5200-hardware-guide.pdf",
    "image": "assets/images/products/juniper-qfx5200-32c.webp"
  },
  "juniper-srx1500": {
    "datasheet": "Datasheets/Network/Juniper/srx1500-hardware-guide.pdf",
    "datasheetPath": "Datasheets/Network/Juniper/srx1500-hardware-guide.pdf",
    "image": "assets/images/products/juniper-srx1500.webp",
    "photo": "assets/images/products/juniper-srx1500.webp"
  },
  "juniper-srx300": {
    "datasheet": "Datasheets/Network/Juniper/srx300-hardware-guide.pdf",
    "datasheetPath": "Datasheets/Network/Juniper/srx300-hardware-guide.pdf",
    "image": "assets/images/products/juniper-srx300.webp",
    "photo": "assets/images/products/juniper-srx300.webp"
  },
  "juniper-srx320": {
    "datasheet": "Datasheets/Network/Juniper/srx320-hardware-guide.pdf",
    "datasheetPath": "Datasheets/Network/Juniper/srx320-hardware-guide.pdf",
    "image": "assets/images/products/juniper-srx320.webp",
    "photo": "assets/images/products/juniper-srx320.webp"
  },
  "juniper-srx340": {
    "datasheet": "Datasheets/Network/Juniper/srx340-hardware-guide.pdf",
    "datasheetPath": "Datasheets/Network/Juniper/srx340-hardware-guide.pdf",
    "image": "assets/images/products/juniper-srx340.webp",
    "photo": "assets/images/products/juniper-srx340.webp"
  },
  "juniper-srx345": {
    "datasheet": "Datasheets/Network/Juniper/srx345-hardware-guide.pdf",
    "datasheetPath": "Datasheets/Network/Juniper/srx345-hardware-guide.pdf",
    "image": "assets/images/products/juniper-srx345.webp",
    "photo": "assets/images/products/juniper-srx345.webp"
  },
  "juniper-srx380": {
    "datasheet": "Datasheets/Network/Juniper/srx380-hardware-guide.pdf",
    "datasheetPath": "Datasheets/Network/Juniper/srx380-hardware-guide.pdf",
    "image": "assets/images/products/juniper-srx380.webp",
    "photo": "assets/images/products/juniper-srx380.webp"
  },
  "juniper-srx4100": {
    "datasheet": "Datasheets/Network/Juniper/srx4100-hardware-guide.pdf",
    "datasheetPath": "Datasheets/Network/Juniper/srx4100-hardware-guide.pdf",
    "image": "assets/images/products/juniper-srx4100.webp",
    "photo": "assets/images/products/juniper-srx4100.webp"
  },
  "juniper-srx4200": {
    "datasheet": "Datasheets/Network/Juniper/srx4200-hardware-guide.pdf",
    "datasheetPath": "Datasheets/Network/Juniper/srx4200-hardware-guide.pdf",
    "image": "assets/images/products/juniper-srx4200.webp",
    "photo": "assets/images/products/juniper-srx4200.webp"
  },
  "juniper-srx4600": {
    "datasheet": "Datasheets/Network/Juniper/srx4600-hardware-guide.pdf",
    "datasheetPath": "Datasheets/Network/Juniper/srx4600-hardware-guide.pdf",
    "image": "assets/images/products/juniper-srx4600.webp",
    "photo": "assets/images/products/juniper-srx4600.webp"
  },
  "meanwell-ndr-120-48": {
    "datasheetPath": null,
    "image": "assets/images/products/meanwell-ndr-120-48.webp"
  },
  "meanwell-ndr-240-48": {
    "datasheetPath": null,
    "image": "assets/images/products/meanwell-ndr-240-48.webp"
  },
  "meraki-ms120-24": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS120 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms120-24.webp"
  },
  "meraki-ms120-24p": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS120 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms120-24.webp"
  },
  "meraki-ms120-48": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS120 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms120-48.webp"
  },
  "meraki-ms120-48fp": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS120 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms120-48.webp"
  },
  "meraki-ms120-48lp": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS120 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms120-48.webp"
  },
  "meraki-ms120-8": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS120-8 Compact Datasheet.pdf",
    "image": "assets/images/products/meraki-ms120-8.webp"
  },
  "meraki-ms120-8fp": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS120-8 Compact Datasheet.pdf",
    "image": "assets/images/products/meraki-ms120-8.webp"
  },
  "meraki-ms120-8lp": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS120-8 Compact Datasheet.pdf",
    "image": "assets/images/products/meraki-ms120-8.webp"
  },
  "meraki-ms125-24": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS125 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms125-24.webp"
  },
  "meraki-ms125-24p": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS125 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms125-24.webp"
  },
  "meraki-ms125-48": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS125 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms125-48.webp"
  },
  "meraki-ms125-48fp": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS125 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms125-48.webp"
  },
  "meraki-ms125-48lp": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS125 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms125-48.webp"
  },
  "meraki-ms130-12x": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS130 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms130-12x.webp"
  },
  "meraki-ms130-24": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS130 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms130-24.webp"
  },
  "meraki-ms130-24p": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS130 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms130-24.webp"
  },
  "meraki-ms130-24x": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS130 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms130-24.webp"
  },
  "meraki-ms130-48": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS130 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms130-48.webp"
  },
  "meraki-ms130-48fp": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS130 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms130-48.webp"
  },
  "meraki-ms130-48p": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS130 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms130-48.webp"
  },
  "meraki-ms130-48x": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS130 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms130-48.webp"
  },
  "meraki-ms130-8": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS130 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms120-8.webp"
  },
  "meraki-ms130-8p": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS130 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms120-8.webp"
  },
  "meraki-ms130-8x": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS130 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms120-8.webp"
  },
  "meraki-ms130r-8p": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS130R Datasheet.pdf",
    "image": "assets/images/products/meraki-ms130r-8p.webp"
  },
  "meraki-ms150-24mp-4x": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS150 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms125-24.webp"
  },
  "meraki-ms150-24p-4g": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS150 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms120-24.webp"
  },
  "meraki-ms150-24p-4x": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS150 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms125-24.webp"
  },
  "meraki-ms150-24t-4g": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS150 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms120-24.webp"
  },
  "meraki-ms150-24t-4x": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS150 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms125-24.webp"
  },
  "meraki-ms150-48fp-4g": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS150 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms120-48.webp"
  },
  "meraki-ms150-48fp-4x": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS150 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms125-48.webp"
  },
  "meraki-ms150-48lp-4g": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS150 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms120-48.webp"
  },
  "meraki-ms150-48lp-4x": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS150 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms125-48.webp"
  },
  "meraki-ms150-48mp": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS150 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms390-24p.webp"
  },
  "meraki-ms210-24p": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS210 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms120-24.webp"
  },
  "meraki-ms210-48fp": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS210 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms120-48.webp"
  },
  "meraki-ms210-48lp": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS210 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms120-48.webp"
  },
  "meraki-ms225-24": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS225 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms125-24.webp"
  },
  "meraki-ms225-24p": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS225 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms125-24.webp"
  },
  "meraki-ms225-48": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS225 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms125-48.webp"
  },
  "meraki-ms225-48fp": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS225 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms125-48.webp"
  },
  "meraki-ms225-48lp": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS225 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms125-48.webp"
  },
  "meraki-ms250-24": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS250 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms125-24.webp"
  },
  "meraki-ms250-24p": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS250 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms125-24.webp"
  },
  "meraki-ms250-48": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS250 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms125-48.webp"
  },
  "meraki-ms250-48fp": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS250 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms125-48.webp"
  },
  "meraki-ms250-48lp": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS250 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms125-48.webp"
  },
  "meraki-ms350-24": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS350 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms125-24.webp"
  },
  "meraki-ms350-24p": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS350 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms125-24.webp"
  },
  "meraki-ms350-48": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS350 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms125-48.webp"
  },
  "meraki-ms350-48fp": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS350 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms125-48.webp"
  },
  "meraki-ms350-48lp": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS350 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms125-48.webp"
  },
  "meraki-ms355-24x": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS355 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms355-24x.webp"
  },
  "meraki-ms355-24x2": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS355 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms355-24x.webp"
  },
  "meraki-ms355-48x": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS355 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms355-48x.webp"
  },
  "meraki-ms355-48x2": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS355 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms355-48x.webp"
  },
  "meraki-ms390-24p": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS390 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms390-24p.webp"
  },
  "meraki-ms390-24u": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS390 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms390-24p.webp"
  },
  "meraki-ms390-24ux": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS390 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms390-24p.webp"
  },
  "meraki-ms390-48p": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS390 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms390-48p.webp"
  },
  "meraki-ms390-48u": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS390 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms390-48p.webp"
  },
  "meraki-ms390-48ux": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS390 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms390-48p.webp"
  },
  "meraki-ms390-48ux2": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS390 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms390-48p.webp"
  },
  "meraki-ms410-16": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS410 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms410-16.webp"
  },
  "meraki-ms410-32": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS410 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms410-32.webp"
  },
  "meraki-ms425-16": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS425 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms425-16.webp"
  },
  "meraki-ms425-32": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS425 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms425-32.webp"
  },
  "meraki-ms450-12": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS450 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms450-12.webp"
  },
  "mg51-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS Accessories Datasheet.pdf",
    "image": "assets/images/products/mg51-hw.webp"
  },
  "mh-n366-ccp-poe-b": {
    "datasheetPath": null,
    "image": null
  },
  "mh-t260-ccp-poe-b": {
    "datasheetPath": null,
    "image": null
  },
  "middle-atlantic-dwr-18-26": {
    "datasheetPath": null,
    "image": null
  },
  "ms120-24-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS120 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms120-24.webp"
  },
  "ms120-24p-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS120 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms120-24.webp"
  },
  "ms120-48-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS120 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms120-48.webp"
  },
  "ms120-48fp-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS120 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms120-48.webp"
  },
  "ms120-48lp-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS120 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms120-48.webp"
  },
  "ms120-8-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS120-8 Compact Datasheet.pdf",
    "image": "assets/images/products/meraki-ms120-8.webp"
  },
  "ms120-8fp-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS120-8 Compact Datasheet.pdf",
    "image": "assets/images/products/meraki-ms120-8.webp"
  },
  "ms120-8lp-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS120-8 Compact Datasheet.pdf",
    "image": "assets/images/products/meraki-ms120-8.webp"
  },
  "ms125-24-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS125 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms125-24.webp"
  },
  "ms125-24p-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS125 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms125-24.webp"
  },
  "ms125-48-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS125 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms125-48.webp"
  },
  "ms125-48fp-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS125 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms125-48.webp"
  },
  "ms125-48lp-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS125 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms125-48.webp"
  },
  "ms130-12x-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS130 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms130-12x.webp"
  },
  "ms130-24-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS130 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms130-24.webp"
  },
  "ms130-24p-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS130 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms130-24.webp"
  },
  "ms130-24x-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS130 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms130-24.webp"
  },
  "ms130-48-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS130 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms130-48.webp"
  },
  "ms130-48fp-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS130 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms130-48.webp"
  },
  "ms130-48p-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS130 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms130-48.webp"
  },
  "ms130-48x-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS130 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms130-48.webp"
  },
  "ms130-8-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS130 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms120-8.webp"
  },
  "ms130-8p-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS130 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms120-8.webp"
  },
  "ms130-8x-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS130 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms120-8.webp"
  },
  "ms130r-8p-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS130R Datasheet.pdf",
    "image": "assets/images/products/meraki-ms130r-8p.webp"
  },
  "ms150-24mp-4x-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS150 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms125-24.webp"
  },
  "ms150-24p-4g-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS150 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms120-24.webp"
  },
  "ms150-24p-4x-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS150 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms125-24.webp"
  },
  "ms150-24t-4g-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS150 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms120-24.webp"
  },
  "ms150-24t-4x-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS150 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms125-24.webp"
  },
  "ms150-48fp-4g-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS150 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms120-48.webp"
  },
  "ms150-48fp-4x-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS150 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms125-48.webp"
  },
  "ms150-48lp-4g-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS150 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms120-48.webp"
  },
  "ms150-48lp-4x-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS150 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms125-48.webp"
  },
  "ms150-48mp-4x": {
    "datasheetPath": "Datasheets/Network/Cisco/cisco-meraki_datasheet_ms_family.pdf",
    "image": "assets/images/products/meraki-ms390-24p.webp"
  },
  "ms150-48mp-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS150 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms390-24p.webp"
  },
  "ms210-24p-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS210 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms120-24.webp"
  },
  "ms210-48fp-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS210 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms120-48.webp"
  },
  "ms210-48lp-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS210 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms120-48.webp"
  },
  "ms225-24-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS225 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms125-24.webp"
  },
  "ms225-24p-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS225 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms125-24.webp"
  },
  "ms225-48-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS225 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms125-48.webp"
  },
  "ms225-48fp-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS225 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms125-48.webp"
  },
  "ms225-48lp-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS225 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms125-48.webp"
  },
  "ms250-24-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS250 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms125-24.webp"
  },
  "ms250-24p-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS250 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms125-24.webp"
  },
  "ms250-48-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS250 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms125-48.webp"
  },
  "ms250-48fp-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS250 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms125-48.webp"
  },
  "ms250-48lp-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS250 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms125-48.webp"
  },
  "ms350-24-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS350 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms125-24.webp"
  },
  "ms350-24p-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS350 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms125-24.webp"
  },
  "ms350-48-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS350 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms125-48.webp"
  },
  "ms350-48fp-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS350 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms125-48.webp"
  },
  "ms350-48lp-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS350 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms125-48.webp"
  },
  "ms355-24x-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS355 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms355-24x.webp"
  },
  "ms355-24x2-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS355 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms355-24x.webp"
  },
  "ms355-48x-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS355 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms355-48x.webp"
  },
  "ms355-48x2-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS355 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms355-48x.webp"
  },
  "ms390-24p-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS390 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms390-24p.webp"
  },
  "ms390-24u-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS390 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms390-24p.webp"
  },
  "ms390-24ux-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS390 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms390-24p.webp"
  },
  "ms390-48p-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS390 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms390-48p.webp"
  },
  "ms390-48u-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS390 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms390-48p.webp"
  },
  "ms390-48ux-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS390 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms390-48p.webp"
  },
  "ms390-48ux2-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS390 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms390-48p.webp"
  },
  "ms410-16-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS410 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms410-16.webp"
  },
  "ms410-32-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS410 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms410-32.webp"
  },
  "ms425-16-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS425 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms425-16.webp"
  },
  "ms425-32-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS425 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms425-32.webp"
  },
  "ms450-12-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS450 Datasheet.pdf",
    "image": "assets/images/products/meraki-ms450-12.webp"
  },
  "mx105-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS Accessories Datasheet.pdf",
    "image": "assets/images/products/mx105-hw.webp"
  },
  "mx250-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS Accessories Datasheet.pdf",
    "image": "assets/images/products/mx250-hw.webp"
  },
  "mx450-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS Accessories Datasheet.pdf",
    "image": "assets/images/products/mx450-hw.webp"
  },
  "mx67-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS Accessories Datasheet.pdf",
    "image": "assets/images/products/mx67-hw.webp"
  },
  "mx68cw-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS Accessories Datasheet.pdf",
    "image": "assets/images/products/mx68cw-hw.webp"
  },
  "mx75-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS Accessories Datasheet.pdf",
    "image": "assets/images/products/mx75-hw.webp"
  },
  "mx85-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS Accessories Datasheet.pdf",
    "image": "assets/images/products/mx85-hw.webp"
  },
  "mx95-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS Accessories Datasheet.pdf",
    "image": "assets/images/products/mx95-hw.webp"
  },
  "nbe-5ac-gen2": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/Ubiquiti NanoBeam 5AC Gen2 - Tech Specs.pdf",
    "image": "assets/images/products/ubnt-nanobeam-5ac.webp"
  },
  "ndr-120-48": {
    "datasheetPath": null,
    "image": "assets/images/products/meanwell-ndr-120-48.webp"
  },
  "ndr-240-48": {
    "datasheetPath": null,
    "image": "assets/images/products/meanwell-ndr-240-48.webp"
  },
  "nf141208": {
    "datasheetPath": null,
    "image": null
  },
  "pa-1410": {
    "datasheetPath": null,
    "image": null
  },
  "pa-440": {
    "datasheetPath": null,
    "image": null
  },
  "qfx5110-48s-afo": {
    "datasheetPath": "Datasheets/Network/Juniper/qfx5110-hardware-guide.pdf",
    "image": "assets/images/products/juniper-qfx5110-48s.webp"
  },
  "qfx5120-32c-afi": {
    "datasheetPath": "Datasheets/Network/Juniper/qfx5120-hardware-guide.pdf",
    "image": "assets/images/products/juniper-qfx5120-32c.webp"
  },
  "qfx5120-48t-afo": {
    "datasheetPath": "Datasheets/Network/Juniper/qfx5120-hardware-guide.pdf",
    "image": "assets/images/products/juniper-qfx5120-48t.webp"
  },
  "qfx5120-48y-afo": {
    "datasheetPath": "Datasheets/Network/Juniper/qfx5120-hardware-guide.pdf",
    "image": "assets/images/products/juniper-qfx5120-48y.webp"
  },
  "qfx5120-48ym-afo": {
    "datasheetPath": "Datasheets/Network/Juniper/qfx5120-hardware-guide.pdf",
    "image": "assets/images/products/juniper-qfx5120-48ym.webp"
  },
  "qfx5200-32c-afi": {
    "datasheetPath": "Datasheets/Network/Juniper/qfx5200-hardware-guide.pdf",
    "image": "assets/images/products/juniper-qfx5200-32c.webp"
  },
  "ruckus-icx7150-24": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 7150 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 7150 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7150-24.webp",
    "photo": "assets/images/products/ruckus-icx7150-24.webp"
  },
  "ruckus-icx7150-24p": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 7150 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 7150 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7150-24p.webp",
    "photo": "assets/images/products/ruckus-icx7150-24p.webp"
  },
  "ruckus-icx7150-48": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 7150 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 7150 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7150-48.webp",
    "photo": "assets/images/products/ruckus-icx7150-48.webp"
  },
  "ruckus-icx7150-48p": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 7150 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 7150 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7150-48p.webp",
    "photo": "assets/images/products/ruckus-icx7150-48p.webp"
  },
  "ruckus-icx7150-48pf": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 7150 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 7150 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7150-48pf.webp",
    "photo": "assets/images/products/ruckus-icx7150-48pf.webp"
  },
  "ruckus-icx7150-48zp": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 7150 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 7150 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7150-48zp.webp",
    "photo": "assets/images/products/ruckus-icx7150-48zp.webp"
  },
  "ruckus-icx7150-c10zp": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 7150 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 7150 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7150-c10zp.webp",
    "photo": "assets/images/products/ruckus-icx7150-c10zp.webp"
  },
  "ruckus-icx7150-c12p": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 7150 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 7150 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7150-c12p.webp",
    "photo": "assets/images/products/ruckus-icx7150-c12p.webp"
  },
  "ruckus-icx7450-24": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX Switch Family Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX Switch Family Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7450-24.webp",
    "photo": "assets/images/products/ruckus-icx7450-24.webp"
  },
  "ruckus-icx7450-24p": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX Switch Family Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX Switch Family Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7450-24p.webp",
    "photo": "assets/images/products/ruckus-icx7450-24p.webp"
  },
  "ruckus-icx7450-48": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX Switch Family Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX Switch Family Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7450-48.webp",
    "photo": "assets/images/products/ruckus-icx7450-48.webp"
  },
  "ruckus-icx7450-48f": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX Switch Family Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX Switch Family Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7450-48f.webp",
    "photo": "assets/images/products/ruckus-icx7450-48f.webp"
  },
  "ruckus-icx7450-48p": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX Switch Family Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX Switch Family Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7450-48p.webp",
    "photo": "assets/images/products/ruckus-icx7450-48p.webp"
  },
  "ruckus-icx7550-24": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 7550 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 7550 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7550-24.webp",
    "photo": "assets/images/products/ruckus-icx7550-24.webp"
  },
  "ruckus-icx7550-24f": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 7550 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 7550 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7550-24f.webp",
    "photo": "assets/images/products/ruckus-icx7550-24f.webp"
  },
  "ruckus-icx7550-24p": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 7550 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 7550 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7550-24p.webp",
    "photo": "assets/images/products/ruckus-icx7550-24p.webp"
  },
  "ruckus-icx7550-24zp": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 7550 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 7550 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7550-24zp.webp",
    "photo": "assets/images/products/ruckus-icx7550-24zp.webp"
  },
  "ruckus-icx7550-48": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 7550 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 7550 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7550-48.webp",
    "photo": "assets/images/products/ruckus-icx7550-48.webp"
  },
  "ruckus-icx7550-48f": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 7550 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 7550 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7550-48f.webp",
    "photo": "assets/images/products/ruckus-icx7550-48f.webp"
  },
  "ruckus-icx7550-48p": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 7550 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 7550 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7550-48p.webp",
    "photo": "assets/images/products/ruckus-icx7550-48p.webp"
  },
  "ruckus-icx7550-48zp": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 7550 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 7550 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7550-48zp.webp",
    "photo": "assets/images/products/ruckus-icx7550-48zp.webp"
  },
  "ruckus-icx7650-48f": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX Switch Family Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX Switch Family Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7650-48f.webp",
    "photo": "assets/images/products/ruckus-icx7650-48f.webp"
  },
  "ruckus-icx7650-48p": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX Switch Family Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX Switch Family Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7650-48p.webp",
    "photo": "assets/images/products/ruckus-icx7650-48p.webp"
  },
  "ruckus-icx7650-48zp": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX Switch Family Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX Switch Family Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7650-48zp.webp",
    "photo": "assets/images/products/ruckus-icx7650-48zp.webp"
  },
  "ruckus-icx7750-26q": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX Switch Family Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX Switch Family Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7750-26q.webp",
    "photo": "assets/images/products/ruckus-icx7750-26q.webp"
  },
  "ruckus-icx7750-48c": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX Switch Family Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX Switch Family Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7750-48c.webp",
    "photo": "assets/images/products/ruckus-icx7750-48c.webp"
  },
  "ruckus-icx7750-48f": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX Switch Family Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX Switch Family Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7750-48f.webp",
    "photo": "assets/images/products/ruckus-icx7750-48f.webp"
  },
  "ruckus-icx7850-32q": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 7850 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 7850 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7850-32q.webp",
    "photo": "assets/images/products/ruckus-icx7850-32q.webp"
  },
  "ruckus-icx7850-48c": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 7850 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 7850 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7850-48c.webp",
    "photo": "assets/images/products/ruckus-icx7850-48c.webp"
  },
  "ruckus-icx7850-48f": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 7850 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 7850 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7850-48f.webp",
    "photo": "assets/images/products/ruckus-icx7850-48f.webp"
  },
  "ruckus-icx7850-48fs": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 7850 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 7850 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx7850-48fs.webp",
    "photo": "assets/images/products/ruckus-icx7850-48fs.webp"
  },
  "ruckus-icx8100-24": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 8100 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 8100 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx8100-24.webp",
    "photo": "assets/images/products/ruckus-icx8100-24.webp"
  },
  "ruckus-icx8100-24p": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 8100 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 8100 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx8100-24p.webp",
    "photo": "assets/images/products/ruckus-icx8100-24p.webp"
  },
  "ruckus-icx8100-48": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 8100 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 8100 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx8100-48.webp",
    "photo": "assets/images/products/ruckus-icx8100-48.webp"
  },
  "ruckus-icx8100-48p": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 8100 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 8100 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx8100-48p.webp",
    "photo": "assets/images/products/ruckus-icx8100-48p.webp"
  },
  "ruckus-icx8100-48pf": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 8100 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 8100 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx8100-48p.webp",
    "photo": "assets/images/products/ruckus-icx8100-48p.webp"
  },
  "ruckus-icx8100-c08pf": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 8100 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 8100 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx8100-c08pf.webp",
    "photo": "assets/images/products/ruckus-icx8100-c08pf.webp"
  },
  "ruckus-icx8100-c16p": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 8100 Switch Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 8100 Switch Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx8100-c16p.webp",
    "photo": "assets/images/products/ruckus-icx8100-c16p.webp"
  },
  "ruckus-icx8200-24": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx8200-24.webp",
    "photo": "assets/images/products/ruckus-icx8200-24.webp"
  },
  "ruckus-icx8200-24f": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx8200-24f.webp",
    "photo": "assets/images/products/ruckus-icx8200-24f.webp"
  },
  "ruckus-icx8200-24fx": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx8200-24fx.webp",
    "photo": "assets/images/products/ruckus-icx8200-24fx.webp"
  },
  "ruckus-icx8200-24p": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx8200-24p.webp",
    "photo": "assets/images/products/ruckus-icx8200-24p.webp"
  },
  "ruckus-icx8200-24xp2": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx8200-24xp2.webp",
    "photo": "assets/images/products/ruckus-icx8200-24xp2.webp"
  },
  "ruckus-icx8200-24zp": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx8200-24zp.webp",
    "photo": "assets/images/products/ruckus-icx8200-24zp.webp"
  },
  "ruckus-icx8200-48": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx8200-48.webp",
    "photo": "assets/images/products/ruckus-icx8200-48.webp"
  },
  "ruckus-icx8200-48f": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx8200-48f.webp",
    "photo": "assets/images/products/ruckus-icx8200-48f.webp"
  },
  "ruckus-icx8200-48np2": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx8200-48np2.webp",
    "photo": "assets/images/products/ruckus-icx8200-48np2.webp"
  },
  "ruckus-icx8200-48p": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx8200-48p.webp",
    "photo": "assets/images/products/ruckus-icx8200-48p.webp"
  },
  "ruckus-icx8200-48pf": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx8200-48pf.webp",
    "photo": "assets/images/products/ruckus-icx8200-48pf.webp"
  },
  "ruckus-icx8200-48pf2": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx8200-48pf2.webp",
    "photo": "assets/images/products/ruckus-icx8200-48pf2.webp"
  },
  "ruckus-icx8200-48zp2": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx8200-48zp2.webp",
    "photo": "assets/images/products/ruckus-icx8200-48zp2.webp"
  },
  "ruckus-icx8200-c08pf": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx8200-c08pf.webp",
    "photo": "assets/images/products/ruckus-icx8200-c08pf.webp"
  },
  "ruckus-icx8200-c08zp": {
    "datasheet": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "datasheetPath": "Datasheets/Network/Ruckus/RUCKUS ICX 8200 Data Sheet.pdf",
    "image": "assets/images/products/ruckus-icx8200-c08zp.webp",
    "photo": "assets/images/products/ruckus-icx8200-c08zp.webp"
  },
  "siklu-eh-1200fx": {
    "datasheetPath": "Datasheets/Network/Siklu/Siklu EtherHaul 1200FX - Tech Specs.pdf",
    "image": "assets/images/products/siklu-eh-1200fx.webp"
  },
  "siklu-eh-8010fx": {
    "datasheetPath": "Datasheets/Network/Siklu/Siklu EtherHaul 8010FX - Tech Specs.pdf",
    "image": "assets/images/products/siklu-eh-8010fx.webp"
  },
  "siklu-mh-tg-n366": {
    "datasheetPath": "Datasheets/Network/Siklu/Siklu MultiHaul TG Node N366 - Tech Specs.pdf",
    "image": "assets/images/products/siklu-mh-tg-n366.webp"
  },
  "siklu-mh-tg-t260": {
    "datasheetPath": "Datasheets/Network/Siklu/Siklu MultiHaul TG Terminal Unit T260 - Tech Specs.pdf",
    "image": "assets/images/products/siklu-mh-tg-t260.webp"
  },
  "siklu-mh-tg-t280": {
    "datasheetPath": "Datasheets/Network/Siklu/Siklu MultiHaul TG Terminal Unit T280 - Tech Specs.pdf",
    "image": "assets/images/products/siklu-mh-tg-t280.webp"
  },
  "smart1500rmxl2ua": {
    "datasheetPath": null,
    "image": null
  },
  "smt1500rm2uc": {
    "datasheetPath": null,
    "image": null
  },
  "smx3000rmlv2unc": {
    "datasheetPath": null,
    "image": null
  },
  "srw12us": {
    "datasheetPath": null,
    "image": null
  },
  "srx1500": {
    "datasheet": "Datasheets/Network/Juniper/srx1500-hardware-guide.pdf",
    "datasheetPath": "Datasheets/Network/Juniper/srx1500-hardware-guide.pdf",
    "image": "assets/images/products/juniper-srx1500.webp",
    "photo": "assets/images/products/juniper-srx1500.webp"
  },
  "srx300": {
    "datasheet": "Datasheets/Network/Juniper/srx300-hardware-guide.pdf",
    "datasheetPath": "Datasheets/Network/Juniper/srx300-hardware-guide.pdf",
    "image": "assets/images/products/juniper-srx300.webp",
    "photo": "assets/images/products/juniper-srx300.webp"
  },
  "srx320": {
    "datasheet": "Datasheets/Network/Juniper/srx320-hardware-guide.pdf",
    "datasheetPath": "Datasheets/Network/Juniper/srx320-hardware-guide.pdf",
    "image": "assets/images/products/juniper-srx320.webp",
    "photo": "assets/images/products/juniper-srx320.webp"
  },
  "srx340": {
    "datasheet": "Datasheets/Network/Juniper/srx340-hardware-guide.pdf",
    "datasheetPath": "Datasheets/Network/Juniper/srx340-hardware-guide.pdf",
    "image": "assets/images/products/juniper-srx340.webp",
    "photo": "assets/images/products/juniper-srx340.webp"
  },
  "srx345": {
    "datasheet": "Datasheets/Network/Juniper/srx345-hardware-guide.pdf",
    "datasheetPath": "Datasheets/Network/Juniper/srx345-hardware-guide.pdf",
    "image": "assets/images/products/juniper-srx345.webp",
    "photo": "assets/images/products/juniper-srx345.webp"
  },
  "srx380": {
    "datasheet": "Datasheets/Network/Juniper/srx380-hardware-guide.pdf",
    "datasheetPath": "Datasheets/Network/Juniper/srx380-hardware-guide.pdf",
    "image": "assets/images/products/juniper-srx380.webp",
    "photo": "assets/images/products/juniper-srx380.webp"
  },
  "srx4100": {
    "datasheet": "Datasheets/Network/Juniper/srx4100-hardware-guide.pdf",
    "datasheetPath": "Datasheets/Network/Juniper/srx4100-hardware-guide.pdf",
    "image": "assets/images/products/juniper-srx4100.webp",
    "photo": "assets/images/products/juniper-srx4100.webp"
  },
  "srx4200": {
    "datasheet": "Datasheets/Network/Juniper/srx4200-hardware-guide.pdf",
    "datasheetPath": "Datasheets/Network/Juniper/srx4200-hardware-guide.pdf",
    "image": "assets/images/products/juniper-srx4200.webp",
    "photo": "assets/images/products/juniper-srx4200.webp"
  },
  "srx4600": {
    "datasheet": "Datasheets/Network/Juniper/srx4600-hardware-guide.pdf",
    "datasheetPath": "Datasheets/Network/Juniper/srx4600-hardware-guide.pdf",
    "image": "assets/images/products/juniper-srx4600.webp",
    "photo": "assets/images/products/juniper-srx4600.webp"
  },
  "tripplite-smart1500rmxl2ua": {
    "datasheetPath": null,
    "image": null
  },
  "tripplite-srw12us-12u": {
    "datasheetPath": null,
    "image": null
  },
  "trove1wp1": {
    "datasheetPath": null,
    "image": null
  },
  "u-poe": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi PoE Injector 15W - Tech Specs.pdf",
    "image": "assets/images/products/unifi_u_poe_af.webp"
  },
  "u-poe+": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi PoE+ Injector 30W - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_poe_at.webp"
  },
  "u-poe++": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi PoE++ Injector 60W - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_poe_bt.webp"
  },
  "u-rack-6u-tl": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Toolless Mini Rack 6U - Tech Specs.pdf",
    "image": "assets/images/products/unifi_toolless_mini_rack.webp"
  },
  "uacc-adapter-210w": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi 210W AC Power Adapter - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_adapter_60w.webp"
  },
  "uacc-adapter-60w": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi 60W AC Power Adapter - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_adapter_60w.webp"
  },
  "uacc-aoc-sfp10": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi 10G Long-Range Direct Attach Cable - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_aoc_sfp10.webp"
  },
  "uacc-aoc-sfp28": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi 25G Long-Range Direct Attach Cable - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_aoc_sfp28.webp"
  },
  "uacc-cable-patch-el-0.15m-w": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Etherlighting Patch Cable - Tech Specs.pdf",
    "image": "assets/images/products/unifi_etherlighting_patch_cable.webp"
  },
  "uacc-cable-patch-el-0.3m-w": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Etherlighting Patch Cable - Tech Specs.pdf",
    "image": "assets/images/products/unifi_etherlighting_patch_cable.webp"
  },
  "uacc-cable-patch-el-1m-w": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Etherlighting Patch Cable - Tech Specs.pdf",
    "image": "assets/images/products/unifi_etherlighting_patch_cable.webp"
  },
  "uacc-cable-patch-el-2m-w": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Etherlighting Patch Cable - Tech Specs.pdf",
    "image": "assets/images/products/unifi_etherlighting_patch_cable.webp"
  },
  "uacc-cable-patch-el-3m-w": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Etherlighting Patch Cable - Tech Specs.pdf",
    "image": "assets/images/products/unifi_etherlighting_patch_cable.webp"
  },
  "uacc-cable-patch-el-5m-w": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Etherlighting Patch Cable - Tech Specs.pdf",
    "image": "assets/images/products/unifi_etherlighting_patch_cable.webp"
  },
  "uacc-cm-rj45": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi SFP to RJ45 Adapter - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_cm_rj45.webp"
  },
  "uacc-cm-rj45-mg": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi SFP+ to RJ45 Adapter - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_cm_rj45_mg.webp"
  },
  "uacc-dac-qsfp28": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi 100G Direct Attach Cable - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_dac_qsfp28.webp"
  },
  "uacc-dac-sfp10": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi 10G Direct Attach Cable - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_dac_sfp10.webp"
  },
  "uacc-dac-sfp28": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi 25G Direct Attach Cable - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_dac_sfp28.webp"
  },
  "uacc-lre": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Long-Range Ethernet Repeater - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_lre.webp"
  },
  "uacc-om-mm-10g-d": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi 10G Multi-Mode Optical Module - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_om_mm_10g_d.webp"
  },
  "uacc-om-qsfp28-lr4": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi 100G LR4 Single-Mode Optical Module - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_om_qsfp28_lr4.webp"
  },
  "uacc-om-qsfp28-sr4": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi 100G SR4 Multi-Mode Optical Module - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_om_qsfp28_sr4.webp"
  },
  "uacc-om-sfp28-lr": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi 25G Single-Mode Optical Module - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_om_sfp28_lr.webp"
  },
  "uacc-om-sfp28-sr": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi 25G Multi-Mode Optical Module - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_om_sfp28_sr.webp"
  },
  "uacc-om-sm-10g-d": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi 10G Single-Mode Optical Module - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_om_sm_10g_d.webp"
  },
  "uacc-poe+++-10g": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi PoE+++ 10G Injector - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_poe_plus_plus_10g.webp"
  },
  "uacc-pro-max-16-rm": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Pro Max 16 Rackmount Kit - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_pro_max_16_rm.webp"
  },
  "uacc-psu-12v-150w": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Hot-Swappable Power Supply 150W - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_psu_12v_150w.webp"
  },
  "uacc-psu-12v-550w": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Hot-Swappable Power Supply 550W - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_psu_12v_550w.webp"
  },
  "uacc-psu-54v-1200w": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Hot-Swappable Power Supply 1200W - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_psu_54v_1200w.webp"
  },
  "uacc-psu-54v-600w": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Hot-Swappable Power Supply 600W - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_psu_54v_600w.webp"
  },
  "uacc-rack-12u-wall-sw-g": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi 12U Wall Swing-Out Cabinet Glass - Tech Specs.pdf",
    "image": "assets/images/products/unifi_rack_12u_wall_sw_g.webp"
  },
  "uacc-rack-12u-wall-sw-p": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi 12U Wall Swing-Out Cabinet Perforated - Tech Specs.pdf",
    "image": "assets/images/products/unifi_rack_12u_wall_sw_p.webp"
  },
  "uacc-rack-42u-1000-p": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi 42U Rack Cabinet 1000mm - Tech Specs.pdf",
    "image": "assets/images/products/unifi_rack_42u_1000_p.webp"
  },
  "uacc-rack-42u-800-g": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi 42U Rack Cabinet 800mm - Tech Specs.pdf",
    "image": "assets/images/products/unifi_rack_42u_800_g.webp"
  },
  "uacc-rack-42u-vcm": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi 42U Vertical Cable Manager - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_rack_42u_vcm.webp"
  },
  "uacc-rack-hcm": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Horizontal Cable Manager - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_rack_hcm.webp"
  },
  "uacc-rack-panel-ocd": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Blank Rack Panel OCD - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_rack_panel_ocd.webp"
  },
  "uacc-rack-panel-patch-blank-24": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi 24-Port Blank Keystone Patch Panel - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_rack_panel_patch_blank_24.webp"
  },
  "uacc-rack-rails-slide": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Sliding Rack Rails - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_rack_rails_slide.webp"
  },
  "uacc-rack-shelf-fd": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Fixed Depth Rack Shelf - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_rack_shelf_fd.webp"
  },
  "uacc-rack-shelf-sd": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Sliding Rack Shelf - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_rack_shelf_sd.webp"
  },
  "ubb": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Building Bridge - Tech Specs.pdf",
    "image": "assets/images/products/ubnt-ubb.webp"
  },
  "ubb-xg": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Building Bridge XG - Tech Specs.pdf",
    "image": "assets/images/products/unifi-ubb-xg.webp"
  },
  "ubnt-af60-hd": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/Ubiquiti airFiber 60 HD - Tech Specs.pdf",
    "image": "assets/images/products/ubnt-af60-hd.webp"
  },
  "ubnt-af60-xr": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/Ubiquiti airFiber 60 XR - Tech Specs.pdf",
    "image": "assets/images/products/ubnt-af60-xr.webp"
  },
  "ubnt-eth-sp-g2": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/Ubiquiti Ethernet Surge Protector Gen2 - Tech Specs.pdf",
    "image": "assets/images/products/ubnt_eth_sp_g2.webp"
  },
  "ubnt-lbe-5ac": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/Ubiquiti airMAX LiteBeam 5AC - Tech Specs.pdf",
    "image": "assets/images/products/ubnt-lbe-5ac.webp"
  },
  "ubnt-nanobeam-5ac": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/Ubiquiti NanoBeam 5AC Gen2 - Tech Specs.pdf",
    "image": "assets/images/products/ubnt-nanobeam-5ac.webp"
  },
  "ubnt-pbe-5ac": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/Ubiquiti airMAX PowerBeam 5AC - Tech Specs.pdf",
    "image": "assets/images/products/ubnt-pbe-5ac.webp"
  },
  "ubnt-ubb": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Building Bridge - Tech Specs.pdf",
    "image": "assets/images/products/ubnt-ubb.webp"
  },
  "ubnt-wave-ap": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/Ubiquiti Wave AP - Tech Specs.pdf",
    "image": "assets/images/products/ubnt-wave-ap.webp"
  },
  "ubnt-wave-lr": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/Ubiquiti Wave Long-Range - Tech Specs.pdf",
    "image": "assets/images/products/ubnt-wave-lr.webp"
  },
  "ubnt-wave-nano": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/Ubiquiti Wave Nano - Tech Specs.pdf",
    "image": "assets/images/products/ubnt-wave-nano.webp"
  },
  "ubnt-wave-pro": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/Ubiquiti Wave Pro - Tech Specs.pdf",
    "image": "assets/images/products/ubnt-wave-pro.webp"
  },
  "ucg-fiber": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Cloud Gateway Fiber - Tech Specs.pdf",
    "image": "assets/images/products/ucg-fiber.webp"
  },
  "ucg-industrial": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Industrial - Tech Specs.pdf",
    "image": "assets/images/products/ucg-industrial.webp"
  },
  "ucg-max": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Cloud Gateway Max - Tech Specs.pdf",
    "image": "assets/images/products/ucg-max.webp"
  },
  "ucg-ultra": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Ultra - Tech Specs.pdf",
    "image": "assets/images/products/ucg-ultra.webp"
  },
  "udb-pro": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Device Bridge Pro - Tech Specs.pdf",
    "image": "assets/images/products/unifi-udb-pro.webp"
  },
  "udm-beast": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Dream Machine Beast - Tech Specs.pdf",
    "image": "assets/images/products/udm-beast.webp"
  },
  "udm-pro": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Dream Machine Pro - Tech Specs.pdf",
    "image": "assets/images/products/udm-pro.webp"
  },
  "udm-pro-max": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Dream Machine Pro Max - Tech Specs.pdf",
    "image": "assets/images/products/udm-pro-max.webp"
  },
  "udm-se": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Dream Machine Special Edition - Tech Specs.pdf",
    "image": "assets/images/products/udm-se.webp"
  },
  "udw": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Dream Wall - Tech Specs.pdf",
    "image": "assets/images/products/udw.webp"
  },
  "unifi-5g-max": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi 5G Max - Tech Specs.pdf",
    "image": "assets/images/products/unifi-5g-max.webp"
  },
  "unifi-ecs-24-poe": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Enterprise Campus 24 PoE - Tech Specs.pdf",
    "image": "assets/images/products/unifi-ecs-24-poe.webp"
  },
  "unifi-ecs-24s": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Enterprise Campus 24S - Tech Specs.pdf",
    "image": "assets/images/products/unifi-ecs-24s.webp"
  },
  "unifi-ecs-24s-poe": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Enterprise Campus 24S PoE - Tech Specs.pdf",
    "image": "assets/images/products/unifi-ecs-24s-poe.webp"
  },
  "unifi-ecs-48-poe": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Enterprise Campus 48 PoE - Tech Specs.pdf",
    "image": "assets/images/products/unifi-ecs-48-poe.webp"
  },
  "unifi-ecs-48s": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Enterprise Campus 48S - Tech Specs.pdf",
    "image": "assets/images/products/unifi-ecs-48s.webp"
  },
  "unifi-ecs-48s-poe": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Enterprise Campus 48S PoE - Tech Specs.pdf",
    "image": "assets/images/products/unifi-ecs-48s-poe.webp"
  },
  "unifi-ecs-agg": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Enterprise Campus Aggregation - Tech Specs.pdf",
    "image": "assets/images/products/unifi-ecs-agg.webp"
  },
  "unifi-ecs-core": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Enterprise Campus Switch Core - Tech Specs.pdf",
    "image": "assets/images/products/unifi-ecs-core.webp"
  },
  "unifi-rack-12u-wall-sw-g": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi 12U Wall Swing-Out Cabinet Glass - Tech Specs.pdf",
    "image": "assets/images/products/unifi_rack_12u_wall_sw_g.webp"
  },
  "unifi-rack-12u-wall-sw-p": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi 12U Wall Swing-Out Cabinet Perforated - Tech Specs.pdf",
    "image": "assets/images/products/unifi_rack_12u_wall_sw_p.webp"
  },
  "unifi-rack-42u-1000-p": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi 42U Rack Cabinet 1000mm - Tech Specs.pdf",
    "image": "assets/images/products/unifi_rack_42u_1000_p.webp"
  },
  "unifi-rack-42u-800-g": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi 42U Rack Cabinet 800mm - Tech Specs.pdf",
    "image": "assets/images/products/unifi_rack_42u_800_g.webp"
  },
  "unifi-u-poe-af": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi PoE Injector 15W - Tech Specs.pdf",
    "image": "assets/images/products/unifi_u_poe_af.webp"
  },
  "unifi-u-rack-6u-tl": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Toolless Mini Rack 6U - Tech Specs.pdf",
    "image": "assets/images/products/unifi_toolless_mini_rack.webp"
  },
  "unifi-uacc-adapter-210w": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi 210W AC Power Adapter - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_adapter_60w.webp"
  },
  "unifi-uacc-adapter-60w": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi 60W AC Power Adapter - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_adapter_60w.webp"
  },
  "unifi-uacc-lre": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Long-Range Ethernet Repeater - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_lre.webp"
  },
  "unifi-uacc-poe-at": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi PoE+ Injector 30W - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_poe_at.webp"
  },
  "unifi-uacc-poe-bt": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi PoE++ Injector 60W - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_poe_bt.webp"
  },
  "unifi-uacc-poe-plus-plus-10g": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi PoE+++ 10G Injector - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_poe_plus_plus_10g.webp"
  },
  "unifi-uacc-pro-max-16-rm": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Pro Max 16 Rackmount Kit - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_pro_max_16_rm.webp"
  },
  "unifi-uacc-psu-12v-150w": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Hot-Swappable Power Supply 150W - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_psu_12v_150w.webp"
  },
  "unifi-uacc-psu-12v-550w": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Hot-Swappable Power Supply 550W - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_psu_12v_550w.webp"
  },
  "unifi-uacc-psu-54v-1200w": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Hot-Swappable Power Supply 1200W - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_psu_54v_1200w.webp"
  },
  "unifi-uacc-psu-54v-600w": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Hot-Swappable Power Supply 600W - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_psu_54v_600w.webp"
  },
  "unifi-uacc-rack-42u-vcm": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi 42U Vertical Cable Manager - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_rack_42u_vcm.webp"
  },
  "unifi-uacc-rack-hcm": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Horizontal Cable Manager - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_rack_hcm.webp"
  },
  "unifi-uacc-rack-panel-ocd": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Blank Rack Panel OCD - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_rack_panel_ocd.webp"
  },
  "unifi-uacc-rack-panel-patch-blank-24": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi 24-Port Blank Keystone Patch Panel - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_rack_panel_patch_blank_24.webp"
  },
  "unifi-uacc-rack-rails-slide": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Sliding Rack Rails - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_rack_rails_slide.webp"
  },
  "unifi-uacc-rack-shelf-fd": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Fixed Depth Rack Shelf - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_rack_shelf_fd.webp"
  },
  "unifi-uacc-rack-shelf-sd": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Sliding Rack Shelf - Tech Specs.pdf",
    "image": "assets/images/products/unifi_uacc_rack_shelf_sd.webp"
  },
  "unifi-ubb": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Building Bridge - Tech Specs.pdf",
    "image": "assets/images/products/unifi-ubb.webp"
  },
  "unifi-ubb-xg": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Building Bridge XG - Tech Specs.pdf",
    "image": "assets/images/products/unifi-ubb-xg.webp"
  },
  "unifi-udb-pro": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Device Bridge Pro - Tech Specs.pdf",
    "image": "assets/images/products/unifi-udb-pro.webp"
  },
  "unifi-ups-2u-pro": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi UPS 2U Pro - Tech Specs.pdf",
    "image": "assets/images/products/unifi_ups_2u_pro.webp"
  },
  "unifi-usp-cable": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi SmartPower Cable - Tech Specs.pdf",
    "image": "assets/images/products/unifi_usp_cable.webp"
  },
  "unifi-usp-pdu-hd": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Power Distribution Hi-Density - Tech Specs.pdf",
    "image": "assets/images/products/unifi_usp_pdu_hd.webp"
  },
  "unifi-usp-pdu-pro": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Power Distribution Pro - Tech Specs.pdf",
    "image": "assets/images/products/unifi_usp_pdu_pro.webp"
  },
  "unifi-usp-rps": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Redundant Power - Tech Specs.pdf",
    "image": "assets/images/products/unifi_usp_rps.webp"
  },
  "unifi-usw-16-poe": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Standard 16 PoE - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-16-poe.webp"
  },
  "unifi-usw-24": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Standard 24 - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-24.webp"
  },
  "unifi-usw-24-poe": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Standard 24 PoE - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-24-poe.webp"
  },
  "unifi-usw-48": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Standard 48 - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-48.webp"
  },
  "unifi-usw-48-poe": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Standard 48 PoE - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-48-poe.webp"
  },
  "unifi-usw-agg": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Aggregation - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-agg.webp"
  },
  "unifi-usw-flex": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Flex - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-flex.webp"
  },
  "unifi-usw-flex-2-5g-5": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Flex 2.5G - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-flex-2-5g-5.webp"
  },
  "unifi-usw-flex-2-5g-8": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Flex 2.5G - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-flex-2-5g-5.webp"
  },
  "unifi-usw-flex-mini": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Flex Mini - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-flex-mini.webp"
  },
  "unifi-usw-flex-utility": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Flex Utility - Tech Specs.pdf",
    "image": "assets/images/products/unifi_usw_flex_utility.webp"
  },
  "unifi-usw-flex-xg": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Flex 10 GbE - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-flex-xg.webp"
  },
  "unifi-usw-hi-cap-agg": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Hi-Capacity Aggregation - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-hi-cap-agg.webp"
  },
  "unifi-usw-industrial": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Industrial - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-industrial.webp"
  },
  "unifi-usw-lite-16-poe": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Lite 16 PoE - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-lite-16-poe.webp"
  },
  "unifi-usw-lite-8-poe": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Lite 8 PoE - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-lite-8-poe.webp"
  },
  "unifi-usw-mission-critical": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi UPS PoE Switch - Tech Specs.pdf",
    "image": "assets/images/products/unifi_usw_mission_critical.webp"
  },
  "unifi-usw-pro-24": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Pro 24 - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-pro-24.webp"
  },
  "unifi-usw-pro-24-poe": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Pro 24 PoE - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-pro-24-poe.webp"
  },
  "unifi-usw-pro-48": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Pro 48 - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-pro-48.webp"
  },
  "unifi-usw-pro-48-poe": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Pro 48 PoE - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-pro-48-poe.webp"
  },
  "unifi-usw-pro-8-poe": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Pro 8 PoE - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-pro-8-poe.webp"
  },
  "unifi-usw-pro-agg": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Pro XG Aggregation - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-pro-agg.webp"
  },
  "unifi-usw-pro-hd-24": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Pro HD 24 - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-pro-hd-24.webp"
  },
  "unifi-usw-pro-hd-24-poe": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Pro HD 24 PoE - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-pro-hd-24-poe.webp"
  },
  "unifi-usw-pro-max-16": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Pro Max 16 - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-pro-max-16.webp"
  },
  "unifi-usw-pro-max-16-poe": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Pro Max 16 PoE - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-pro-max-16-poe.webp"
  },
  "unifi-usw-pro-max-24": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Pro Max 24 - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-pro-max-24.webp"
  },
  "unifi-usw-pro-max-24-poe": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Pro Max 24 PoE - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-pro-max-24-poe.webp"
  },
  "unifi-usw-pro-max-48": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Pro Max 48 - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-pro-max-48.webp"
  },
  "unifi-usw-pro-max-48-poe": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Pro Max 48 PoE - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-pro-max-48-poe.webp"
  },
  "unifi-usw-pro-xg-10-poe": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Pro XG 10 PoE - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-pro-xg-10-poe.webp"
  },
  "unifi-usw-pro-xg-24": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Pro XG 24 - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-pro-xg-24.webp"
  },
  "unifi-usw-pro-xg-24-poe": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Pro XG 24 PoE - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-pro-xg-24-poe.webp"
  },
  "unifi-usw-pro-xg-48": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Pro XG 48 - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-pro-xg-48.webp"
  },
  "unifi-usw-pro-xg-48-poe": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Pro XG 48 PoE - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-pro-xg-48-poe.webp"
  },
  "unifi-usw-pro-xg-8-poe": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Pro XG 8 PoE - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-pro-xg-8-poe.webp"
  },
  "unifi-usw-pro-xg-agg": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Pro XG Aggregation - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-pro-xg-agg.webp"
  },
  "unifi-usw-ultra": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Ultra - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-ultra.webp"
  },
  "unifi-usw-ultra-210w": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Ultra 210W - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-ultra.webp"
  },
  "unifi-usw-ultra-60w": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Ultra 60W - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-ultra.webp"
  },
  "unifi-usw-wan": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi WAN Switch - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-wan.webp"
  },
  "unifi-usw-wan-rj45": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi WAN Switch RJ45 - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-wan-rj45.webp"
  },
  "ups-2u-pro": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi UPS 2U Pro - Tech Specs.pdf",
    "image": "assets/images/products/unifi_ups_2u_pro.webp"
  },
  "usp-cable": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi SmartPower Cable - Tech Specs.pdf",
    "image": "assets/images/products/unifi_usp_cable.webp"
  },
  "usp-pdu-hd": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Power Distribution Hi-Density - Tech Specs.pdf",
    "image": "assets/images/products/unifi_usp_pdu_hd.webp"
  },
  "usp-pdu-pro": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Power Distribution Pro - Tech Specs.pdf",
    "image": "assets/images/products/unifi_usp_pdu_pro.webp"
  },
  "usp-rps": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Redundant Power - Tech Specs.pdf",
    "image": "assets/images/products/unifi_usp_rps.webp"
  },
  "usw-16-poe": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Standard 16 PoE - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-16-poe.webp"
  },
  "usw-24": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Standard 24 - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-24.webp"
  },
  "usw-24-poe": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Standard 24 PoE - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-24-poe.webp"
  },
  "usw-48": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Standard 48 - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-48.webp"
  },
  "usw-48-poe": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Standard 48 PoE - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-48-poe.webp"
  },
  "usw-aggregation": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Aggregation - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-agg.webp"
  },
  "usw-flex": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Flex - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-flex.webp"
  },
  "usw-flex-2.5g-5": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Flex 2.5G - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-flex-2-5g-5.webp"
  },
  "usw-flex-2.5g-8": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Flex 2.5G - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-flex-2-5g-5.webp"
  },
  "usw-flex-mini": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Flex Mini - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-flex-mini.webp"
  },
  "usw-flex-utility": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Flex Utility - Tech Specs.pdf",
    "image": "assets/images/products/unifi_usw_flex_utility.webp"
  },
  "usw-flex-xg": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Flex 10 GbE - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-flex-xg.webp"
  },
  "usw-hi-capacity-aggregation": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Hi-Capacity Aggregation - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-hi-cap-agg.webp"
  },
  "usw-industrial": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Industrial - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-industrial.webp"
  },
  "usw-lite-16-poe": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Lite 16 PoE - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-lite-16-poe.webp"
  },
  "usw-lite-8-poe": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Lite 8 PoE - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-lite-8-poe.webp"
  },
  "usw-mission-critical": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi UPS PoE Switch - Tech Specs.pdf",
    "image": "assets/images/products/unifi_usw_mission_critical.webp"
  },
  "usw-pro-24": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Pro 24 - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-pro-24.webp"
  },
  "usw-pro-24-poe": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Pro 24 PoE - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-pro-24-poe.webp"
  },
  "usw-pro-48": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Pro 48 - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-pro-48.webp"
  },
  "usw-pro-48-poe": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Pro 48 PoE - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-pro-48-poe.webp"
  },
  "usw-pro-8-poe": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Pro 8 PoE - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-pro-8-poe.webp"
  },
  "usw-pro-aggregation": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Pro XG Aggregation - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-pro-agg.webp"
  },
  "usw-pro-hd-24": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Pro HD 24 - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-pro-hd-24.webp"
  },
  "usw-pro-hd-24-poe": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Pro HD 24 PoE - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-pro-hd-24-poe.webp"
  },
  "usw-pro-max-16": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Pro Max 16 - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-pro-max-16.webp"
  },
  "usw-pro-max-16-poe": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Pro Max 16 PoE - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-pro-max-16-poe.webp"
  },
  "usw-pro-max-24": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Pro Max 24 - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-pro-max-24.webp"
  },
  "usw-pro-max-24-poe": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Pro Max 24 PoE - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-pro-max-24-poe.webp"
  },
  "usw-pro-max-48": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Pro Max 48 - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-pro-max-48.webp"
  },
  "usw-pro-max-48-poe": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Pro Max 48 PoE - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-pro-max-48-poe.webp"
  },
  "usw-pro-xg-10-poe": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Pro XG 10 PoE - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-pro-xg-10-poe.webp"
  },
  "usw-pro-xg-24": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Pro XG 24 - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-pro-xg-24.webp"
  },
  "usw-pro-xg-24-poe": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Pro XG 24 PoE - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-pro-xg-24-poe.webp"
  },
  "usw-pro-xg-48": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Pro XG 48 - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-pro-xg-48.webp"
  },
  "usw-pro-xg-48-poe": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Pro XG 48 PoE - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-pro-xg-48-poe.webp"
  },
  "usw-pro-xg-8-poe": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Pro XG 8 PoE - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-pro-xg-8-poe.webp"
  },
  "usw-pro-xg-aggregation": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Pro XG Aggregation - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-pro-xg-agg.webp"
  },
  "usw-ultra": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Ultra - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-ultra.webp"
  },
  "usw-ultra-210w": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Ultra 210W - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-ultra.webp"
  },
  "usw-ultra-60w": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Ultra 60W - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-ultra.webp"
  },
  "usw-wan": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi WAN Switch - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-wan.webp"
  },
  "usw-wan-rj45": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi WAN Switch RJ45 - Tech Specs.pdf",
    "image": "assets/images/products/unifi-usw-wan-rj45.webp"
  },
  "ux": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Express - Tech Specs.pdf",
    "image": "assets/images/products/ux.webp"
  },
  "uxg-enterprise": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Enterprise Firewall - Tech Specs.pdf",
    "image": "assets/images/products/uxg-enterprise.webp"
  },
  "uxg-pro": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/UniFi Gateway Pro - Tech Specs.pdf",
    "image": "assets/images/products/uxg-pro.webp"
  },
  "wave-ap": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/Ubiquiti Wave AP - Tech Specs.pdf",
    "image": "assets/images/products/ubnt-wave-ap.webp"
  },
  "wave-nano": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/Ubiquiti Wave Nano - Tech Specs.pdf",
    "image": "assets/images/products/ubnt-wave-nano.webp"
  },
  "wave-pro": {
    "datasheetPath": "Datasheets/Network/Ubiquiti/Ubiquiti Wave Pro - Tech Specs.pdf",
    "image": "assets/images/products/ubnt-wave-pro.webp"
  },
  "z4c-hw": {
    "datasheetPath": "Datasheets/Network/Cisco/Cisco Meraki MS Accessories Datasheet.pdf",
    "image": "assets/images/products/z4c-hw.webp"
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CATALOG_ASSETS };
}
