# Welcome to Atlana

Atlana is our web interface used to configure and run workflows for processing drone captured data.

## What's available
Aside from providing a convienient way for running workflows, we also provide:

 * configure one or more storage locations at the folder and file levels
 * download and restore configured storage locations
 * run workflows
 * create new workflows that use git repositories
 * re-run jobs you've created and jobs others have created
 * download and restore workflows you've created and workflows you've run

Configured storage locations and worflows are downloaded in JSON format and can be shared with others.

## Tutorial
Items needed:

- an orthomosaic image to be processed
- a GeoJSON file containing the plots of interest
- an optional YAML file containing [experiment information](https://osf.io/xdkcy/wiki/Configuration%20YAML/)

Note that the geographic boundaries of the image don't need to match that of the plots.
Only those plots that intersect the image will be processed.

Additionally, the coordinate system of the image doesn't need to match that of the plots, points are converted automatically.

We also provide an [archive of sample data](https://data.cyverse.org/dav-anon/iplant/projects/aes/cct/diag/sample-data/sample_website_data.tar.gz
) that can be downloaded and used in this Tutorial.
Be sure to extract the files from this archive before uploading them.
Uploading the archive will not allow the files in the archive to be used.

The following `bash` commands can be used to extract the files from the downloaded archive.
The commands for your computer may be different.

```bash
gunzip sample_website_data.tar.gz
tar -xvf sample_website_data.tar
```

### Uploading and configuring files
On the main page of the site, click the `files` link under **Data Sources**.

Next click the upload icon, select and upload the file to process.
You will see an "uploading files" message on the icon if it takes a few seconds to upload the files.

Next, select "Server Side" from the drop down on the upper right of the page and click "New".
This will bring up a window showing the uploaded files.
Select the "OK" buttton to complette the configuration.

The configured access is now available to workflows and shown on the page.

You can return to the main page by clicking the "back" button or the logo.

### Running a workflow
On the main page of the site, click the `Image` link under **Workflows**.

Choose "Canopy Cover" from the drop down on the upper right of the page and click "Run".
The entries for running this workflow are now shown on the page.

Select the ellipses next to "Image file" to bring up the browsing window.
Since we've  only defined one file configuration, it will be automatically chosen for us.
Select the orthomosaic file and click the "OK" button.
If you are using the sample data, the name of the file to choose is "sample_orthophoto.tif".

Click the ellipses next to each of the other entries to choose the GeoTIFF and YAML files to use.

Once the fields are fill in, click the "Run" button under the entries to start the workflow.
You will be returned to the Workflow listing page.

To see how the workflow job is proceeding, click the "View" button next to the workflow just created.
This will display a page where the status of the job is display and you can access normal and error messages.
The status of the job is automatically updated.
To  update the messages and errors, click the "Refresh" button.
If there are many messages retreived from the server, it can take a few seconds before the messages are displayed.

Use the "back" button to return to the workflow listing page once the workflow status shows "Finished".

### Downloading the results
On the workflow listing page, completed workflows have a download button to the far right of their name.
Clicking the download button will download the CSV file ccontaining the results and the JSON of the job definition.

