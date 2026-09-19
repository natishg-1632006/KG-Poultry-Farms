package com.kgpoultry.app;

import android.app.Activity;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Intent;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.util.Log;
import android.widget.Toast;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

@CapacitorPlugin(name = "DownloadPdf")
public class DownloadPdfPlugin extends Plugin {

    private static final String TAG = "DownloadPdfPlugin";

    @PluginMethod
    public void sharePdf(PluginCall call) {
        String base64Data = call.getString("base64Data");
        String filename = call.getString("filename", "invoice.pdf");
        String targetPackage = call.getString("targetPackage", null);
        String phone = call.getString("phone", null);

        if (base64Data == null || base64Data.isEmpty()) {
            call.reject("base64Data is required");
            return;
        }

        try {
            // Clean base64 string if data URI header or whitespace is present
            if (base64Data.contains(",")) {
                base64Data = base64Data.substring(base64Data.indexOf(",") + 1);
            }
            base64Data = base64Data.replaceAll("\\s+", "");

            byte[] pdfBytes = Base64.decode(base64Data, Base64.DEFAULT);

            // 1. Write file to internal app cache (no storage permissions required on Android!)
            File cacheDir = getContext().getCacheDir();
            File file = new File(cacheDir, filename);
            FileOutputStream out = new FileOutputStream(file);
            out.write(pdfBytes);
            out.flush();
            out.close();

            Log.d(TAG, "1. PDF file generated: " + file.getAbsolutePath() + " (size: " + file.length() + " bytes)");

            // 2. Obtain FileProvider content URI
            Uri contentUri = FileProvider.getUriForFile(
                getContext(),
                getContext().getPackageName() + ".fileprovider",
                file
            );

            Log.d(TAG, "2. PDF URI created: " + contentUri);

            // 3. Confirm Activity exists
            Activity activity = getActivity();
            Log.d(TAG, "3. Activity reference: " + activity);

            if (activity == null) {
                Toast.makeText(getContext(), "Unable to open share menu: Activity is null", Toast.LENGTH_LONG).show();
                call.reject("Activity is null");
                return;
            }

            // 4. Create native Android share intent
            Intent shareIntent = new Intent(Intent.ACTION_SEND);
            shareIntent.setType("application/pdf");
            shareIntent.putExtra(Intent.EXTRA_STREAM, contentUri);
            shareIntent.putExtra(Intent.EXTRA_SUBJECT, filename);
            shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

            if (phone != null && !phone.trim().isEmpty()) {
                String cleanPhone = phone.replaceAll("\\D", "");
                if (cleanPhone.startsWith("0") && cleanPhone.length() == 11) {
                    cleanPhone = cleanPhone.substring(1);
                }
                if (cleanPhone.length() == 10) {
                    cleanPhone = "91" + cleanPhone;
                }
                if (!cleanPhone.isEmpty()) {
                    shareIntent.putExtra("jid", cleanPhone + "@s.whatsapp.net");
                    Log.d(TAG, "Targeting direct WhatsApp chat JID: " + cleanPhone + "@s.whatsapp.net");
                }
                if (targetPackage == null || targetPackage.isEmpty()) {
                    targetPackage = "whatsapp";
                }
            }

            boolean isDirectTarget = false;
            if (targetPackage != null && !targetPackage.isEmpty()) {
                isDirectTarget = true;
                String pkgToSet = "com.whatsapp";
                try {
                    getContext().getPackageManager().getPackageInfo("com.whatsapp", 0);
                    pkgToSet = "com.whatsapp";
                    Log.d(TAG, "Standard WhatsApp detected (com.whatsapp)");
                } catch (Exception e1) {
                    try {
                        getContext().getPackageManager().getPackageInfo("com.whatsapp.w4b", 0);
                        pkgToSet = "com.whatsapp.w4b";
                        Log.d(TAG, "WhatsApp Business detected (com.whatsapp.w4b)");
                    } catch (Exception e2) {
                        pkgToSet = "com.whatsapp";
                        Log.w(TAG, "Package info check exception, defaulting direct package target to com.whatsapp");
                    }
                }
                shareIntent.setPackage(pkgToSet);
            }

            final boolean useDirectIntent = isDirectTarget;

            Log.d(TAG, "4. Opening share intent (targetPackage: " + targetPackage + ", direct: " + useDirectIntent + ", package: " + shareIntent.getPackage() + ")...");

            activity.runOnUiThread(() -> {
                try {
                    Intent launchIntent;
                    if (useDirectIntent && shareIntent.getPackage() != null) {
                        launchIntent = shareIntent;
                    } else {
                        launchIntent = Intent.createChooser(shareIntent, "Share PDF Invoice");
                        launchIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN) {
                            launchIntent.setClipData(android.content.ClipData.newRawUri("PDF Invoice", contentUri));
                        }
                    }

                    activity.startActivity(launchIntent);
                    Log.d(TAG, "5. Direct WhatsApp Activity launched successfully!");

                    JSObject ret = new JSObject();
                    ret.put("success", true);
                    ret.put("uri", contentUri.toString());
                    call.resolve(ret);
                } catch (Exception e) {
                    Log.e(TAG, "Failed to start share chooser", e);
                    Toast.makeText(activity, "Could not open share menu: " + e.getMessage(), Toast.LENGTH_LONG).show();
                    call.reject("Could not open share menu: " + e.getMessage(), e);
                }
            });
        } catch (Exception e) {
            Log.e(TAG, "Failed to share PDF exception: ", e);
            call.reject("Failed to share PDF: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void downloadPdf(PluginCall call) {
        String base64Data = call.getString("base64Data");
        String filename = call.getString("filename", "invoice.pdf");

        if (base64Data == null || base64Data.isEmpty()) {
            call.reject("base64Data and filename are required");
            return;
        }

        try {
            if (base64Data.contains(",")) {
                base64Data = base64Data.substring(base64Data.indexOf(",") + 1);
            }
            base64Data = base64Data.replaceAll("\\s+", "");

            byte[] pdfBytes = Base64.decode(base64Data, Base64.DEFAULT);
            Uri savedUri = null;
            String savedPath = null;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                // Android 10+ (API 29+): Use MediaStore API to save directly into public Downloads folder
                ContentResolver resolver = getContext().getContentResolver();
                ContentValues values = new ContentValues();
                values.put(MediaStore.MediaColumns.DISPLAY_NAME, filename);
                values.put(MediaStore.MediaColumns.MIME_TYPE, "application/pdf");
                values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
                values.put(MediaStore.MediaColumns.IS_PENDING, 1);

                Uri uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                if (uri != null) {
                    OutputStream out = resolver.openOutputStream(uri);
                    if (out != null) {
                        out.write(pdfBytes);
                        out.flush();
                        out.close();
                    }
                    values.clear();
                    values.put(MediaStore.MediaColumns.IS_PENDING, 0);
                    resolver.update(uri, values, null, null);
                    savedUri = uri;
                    savedPath = Environment.DIRECTORY_DOWNLOADS + "/" + filename;
                }
            } else {
                // Android 9 and lower: Save to public external Downloads directory
                File downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                if (!downloadsDir.exists()) {
                    downloadsDir.mkdirs();
                }
                File file = new File(downloadsDir, filename);
                FileOutputStream out = new FileOutputStream(file);
                out.write(pdfBytes);
                out.flush();
                out.close();

                savedPath = file.getAbsolutePath();
                savedUri = Uri.fromFile(file);

                MediaScannerConnection.scanFile(
                    getContext(),
                    new String[]{file.getAbsolutePath()},
                    new String[]{"application/pdf"},
                    null
                );
            }

            if (savedUri != null) {
                getActivity().runOnUiThread(() -> {
                    Toast.makeText(getContext(), "PDF Saved to Downloads: " + filename, Toast.LENGTH_LONG).show();
                });

                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("uri", savedUri.toString());
                ret.put("path", savedPath != null ? savedPath : filename);
                call.resolve(ret);
            } else {
                call.reject("Could not create MediaStore entry");
            }
        } catch (Exception e) {
            call.reject("Failed to save PDF: " + e.getMessage(), e);
        }
    }
}
