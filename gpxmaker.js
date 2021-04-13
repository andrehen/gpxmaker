const save = (filename, data) => {
    var blob = new Blob([data], {type: 'text/xml'});
    if(window.navigator.msSaveOrOpenBlob) {
        window.navigator.msSaveBlob(blob, filename);
    }
    else{
        var elem = window.document.createElement('a');
        elem.href = window.URL.createObjectURL(blob);
        elem.download = filename;        
        document.body.appendChild(elem);
        elem.click();        
        document.body.removeChild(elem);
    }
}

const isoData = (d) => (new Date(d)).toISOString();

const handleFileSelect = (evt) => {
    const files = evt.target.files; // FileList object
    const qtyFiles = files.length;

    // files is a FileList of File objects. List some properties.
    const output = [];
    let merged = [];

    let filesProcessed = 0;

    if (typeof window.FileReader !== 'function') {
        document.getElementById('result').innerHTML = 'The file API isn\'t supported on this browser yet.';
        return;
    }

    if (qtyFiles != 2) {
        document.getElementById('result').innerHTML = 'There should be 2 files. The location_data and the live_data';
        return;
    }

    const finalize = data => {
        //console.log('final data:', data);
        let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx creator="StravaGPX" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd http://www.garmin.com/xmlschemas/GpxExtensions/v3 http://www.garmin.com/xmlschemas/GpxExtensionsv3.xsd http://www.garmin.com/xmlschemas/TrackPointExtension/v1 http://www.garmin.com/xmlschemas/TrackPointExtensionv1.xsd" version="1.1" xmlns="http://www.topografix.com/GPX/1/1" xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1" xmlns:gpxx="http://www.garmin.com/xmlschemas/GpxExtensions/v3">
    <metadata>
        <time>${isoData(data[0].start_time)}</time>
    </metadata>
    <trk>
        <name>My New Ride</name>
        <type>1</type>
        <trkseg>`;

        data.forEach(entry => {
            if (!entry.latitude || !entry.longitude ) return;

            gpx += `
        <trkpt lat="${entry.latitude}" lon="${entry.longitude}">
            <time>${isoData(entry.start_time)}</time>`;

            if(entry.altitude){
                gpx += `
            <ele>${entry.altitude}</ele>`;
            }

            if (entry.heart_rate) {
                gpx += `
            <extensions>
                <gpxtpx:TrackPointExtension>
                    <gpxtpx:hr>${entry.heart_rate}</gpxtpx:hr>
                </gpxtpx:TrackPointExtension>
            </extensions>`;
            }
            gpx += `
        </trkpt>`;
        });

        gpx += `
        </trkseg>
    </trk>
</gpx>`;

        save('workout.gpx', gpx);
    }

    Object.keys(files).map((key, idx) => {

        let f = files[key];
        if (!f.type.match('application/json')) {
            console.warn('Given file is not Json');
            return;
        }

        output.push('<li><strong>', escape(f.name), '</strong> (', f.type || 'n/a', ') - ',
            f.size, ' bytes, last modified: ',
            f.lastModifiedDate ? f.lastModifiedDate.toLocaleDateString() : 'n/a',
        '</li>');
        
        fr = new FileReader();
        fr.onload = function(e) {
            let result = JSON.parse(e.target.result);

            // If we are on the live_data data, we filter to only have heart_rate data.
            if (result.find(e => e.heart_rate != null)) {
                result = result.filter(e => e.heart_rate!= null );
            }

            merged = [...merged, ...result];

            filesProcessed++;
            if(filesProcessed === qtyFiles){
                // Sort by time
                merged.sort((a, b) => {
                    if (a.start_time > b.start_time) return 1;
                    if (a.start_time < b.start_time) return -1;
                    return 0;
                })

                let storedEntry = null;
                let consolidatedData = merged.map((entry, index, orignal) => {
                    if (entry.heart_rate != null) {
                        storedEntry = entry;
                        return null;
                    }

                    if (storedEntry != null) {
                        entry.heart_rate = storedEntry.heart_rate;
                        storedEntry = null;
                        return entry
                    }

                    return entry;
                });

                consolidatedData = consolidatedData.filter(e => e != null);

                finalize(consolidatedData);
            }
        }
        fr.readAsText(f);

    });
    
    document.getElementById('list').innerHTML = '<ul>' + output.join('') + '</ul>';    
}
